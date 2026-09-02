import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUCKET = "menu-images";
const ALLOWED_SOURCE_HOST = "catalog.kurdunus.com";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_BATCH = 10;
const DEFAULT_BATCH = 5;
const FETCH_TIMEOUT_MS = 15000;
const ALLOWED_ROLES = new Set(["super_admin", "owner", "manager", "menu_editor"]);

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MIME_ALIASES: Record<string, string> = {
  "image/pjpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/x-png": "image/png",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeLimit(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_BATCH;
  return Math.max(1, Math.min(MAX_BATCH, Math.floor(n)));
}

function validateSourceUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid source URL");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Unsupported source URL protocol");
  }
  if (url.hostname.toLowerCase() !== ALLOWED_SOURCE_HOST) {
    throw new Error(`Source host is not allowed: ${url.hostname}`);
  }
  return url;
}

async function fetchImage(rawUrl: string) {
  const sourceUrl = validateSourceUrl(rawUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(sourceUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "RESTBR-Image-Migrator/1.0",
        Accept: "image/jpeg,image/png,image/webp,image/gif,*/*;q=0.1",
      },
    });

    if (!response.ok) {
      throw new Error(`Source fetch failed with HTTP ${response.status}`);
    }

    const finalUrl = new URL(response.url || sourceUrl.toString());
    if (finalUrl.hostname.toLowerCase() !== ALLOWED_SOURCE_HOST) {
      throw new Error(`Redirected source host is not allowed: ${finalUrl.hostname}`);
    }

    const rawContentType = (response.headers.get("content-type") || "")
      .split(";", 1)[0]
      .trim()
      .toLowerCase();
    const contentType = MIME_ALIASES[rawContentType] || rawContentType;
    const extension = MIME_TO_EXT[contentType];
    if (!extension) {
      throw new Error(`Unsupported image content type: ${rawContentType || "unknown"}`);
    }

    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_FILE_BYTES) {
      throw new Error(`Image exceeds ${MAX_FILE_BYTES} bytes`);
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0) throw new Error("Downloaded image is empty");
    if (bytes.byteLength > MAX_FILE_BYTES) {
      throw new Error(`Image exceeds ${MAX_FILE_BYTES} bytes`);
    }

    return { bytes, contentType, extension, finalUrl: finalUrl.toString() };
  } finally {
    clearTimeout(timeout);
  }
}

function publicStoragePrefix(supabaseUrl: string) {
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/`;
}

function objectPath(productId: string, extension: string) {
  const safeId = productId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const nonce = crypto.randomUUID().slice(0, 8);
  return `products/${safeId}/migrated-${Date.now()}-${nonce}.${extension}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !token) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    const caller = userData?.user;
    if (userError || !caller?.id) return json({ ok: false, error: "Unauthorized" }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: callerProfile, error: profileError } = await adminClient
      .from("admin_users")
      .select("role,is_active")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (
      profileError ||
      !callerProfile ||
      callerProfile.is_active !== true ||
      !ALLOWED_ROLES.has(String(callerProfile.role || ""))
    ) {
      return json({ ok: false, error: "Menu-management access required" }, 403);
    }

    let payload: Record<string, unknown> = {};
    try {
      payload = (await req.json()) || {};
    } catch {
      payload = {};
    }

    const dryRun = payload.dryRun !== false;
    const limit = safeLimit(payload.limit);
    const storagePrefix = publicStoragePrefix(supabaseUrl);

    const { data: rows, error: rowsError } = await adminClient
      .from("products")
      .select("id,name_ar,image_url,updated_at")
      .not("image_url", "is", null)
      .neq("image_url", "")
      .order("id", { ascending: true });

    if (rowsError) throw new Error(`products: ${rowsError.message}`);

    const externalRows = (rows || []).filter((row: any) => {
      const url = String(row.image_url || "").trim();
      return url && !url.startsWith(storagePrefix);
    });

    if (dryRun) {
      const sample = externalRows.slice(0, limit).map((row: any) => ({
        id: row.id,
        name_ar: row.name_ar,
        image_url: row.image_url,
      }));
      return json({
        ok: true,
        dry_run: true,
        total_products: rows?.length || 0,
        external_remaining: externalRows.length,
        batch_limit: limit,
        sample,
      });
    }

    const batch = externalRows.slice(0, limit);
    const results: any[] = [];

    for (const row of batch as any[]) {
      const productId = String(row.id || "");
      const oldUrl = String(row.image_url || "").trim();
      const nameAr = String(row.name_ar || "");

      let uploadedPath = "";
      try {
        validateSourceUrl(oldUrl);
        const image = await fetchImage(oldUrl);
        uploadedPath = objectPath(productId, image.extension);

        const { error: uploadError } = await adminClient.storage
          .from(BUCKET)
          .upload(uploadedPath, image.bytes, {
            contentType: image.contentType,
            cacheControl: "31536000",
            upsert: false,
          });
        if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

        const { data: publicUrlData } = adminClient.storage.from(BUCKET).getPublicUrl(uploadedPath);
        const newUrl = String(publicUrlData?.publicUrl || "").trim();
        if (!newUrl.startsWith(storagePrefix)) {
          throw new Error("Generated public Storage URL is invalid");
        }

        const { data: updated, error: updateError } = await adminClient
          .from("products")
          .update({ image_url: newUrl })
          .eq("id", productId)
          .eq("image_url", oldUrl)
          .select("id,image_url")
          .maybeSingle();

        if (updateError) {
          await adminClient.storage.from(BUCKET).remove([uploadedPath]);
          uploadedPath = "";
          throw new Error(`Database update failed: ${updateError.message}`);
        }

        if (!updated || updated.image_url !== newUrl) {
          await adminClient.storage.from(BUCKET).remove([uploadedPath]);
          uploadedPath = "";
          results.push({
            id: productId,
            name_ar: nameAr,
            status: "skipped",
            reason: "Product image changed during migration",
          });
          continue;
        }

        results.push({
          id: productId,
          name_ar: nameAr,
          status: "migrated",
          old_url: oldUrl,
          new_url: newUrl,
          object_path: uploadedPath,
          bytes: image.bytes.byteLength,
          content_type: image.contentType,
        });
      } catch (error) {
        if (uploadedPath) {
          try {
            const { data: current } = await adminClient
              .from("products")
              .select("image_url")
              .eq("id", productId)
              .maybeSingle();
            const currentUrl = String(current?.image_url || "");
            if (!currentUrl.includes(`/storage/v1/object/public/${BUCKET}/${uploadedPath}`)) {
              await adminClient.storage.from(BUCKET).remove([uploadedPath]);
            }
          } catch {
            // Never delete a possibly referenced upload when verification itself fails.
          }
        }

        results.push({
          id: productId,
          name_ar: nameAr,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const migrated = results.filter((item) => item.status === "migrated").length;
    const failed = results.filter((item) => item.status === "failed").length;
    const skipped = results.filter((item) => item.status === "skipped").length;

    return json({
      ok: true,
      dry_run: false,
      requested: batch.length,
      migrated,
      failed,
      skipped,
      external_remaining_before_batch: externalRows.length,
      external_remaining_estimate: Math.max(0, externalRows.length - migrated),
      results,
    });
  } catch (error) {
    console.error("migrate-menu-images error", error);
    return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
