// RESTBR Super Admin — Onboarding Preflight Gate V1
// Adds a non-destructive server-side validation step before admin_create_restaurant.
(() => {
  'use strict';

  const form = document.getElementById('restaurantForm');
  if (!form || window.__RESTBR_ONBOARDING_PREFLIGHT_V1__) return;
  window.__RESTBR_ONBOARDING_PREFLIGHT_V1__ = true;

  let allowNextSubmit = false;
  let preflightClient = null;

  const $ = id => document.getElementById(id);

  function normalizeSlug(value) {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 63);
  }

  function setMessage(text, kind = '') {
    const el = $('createMsg');
    if (!el) return;
    el.textContent = text || '';
    el.className = `message wide${kind ? ` ${kind}` : ''}`;
  }

  function friendlyErrors(errors) {
    const labels = {
      restaurant_name_required: 'اسم المطعم مطلوب.',
      invalid_slug: 'الـSlug غير صالح. استخدم أحرف إنجليزية صغيرة وأرقام وشرطة فقط.',
      reserved_slug: 'هذا الـSlug محجوز للمنصة. اختر اسمًا آخر.',
      invalid_default_language: 'اللغة الافتراضية غير صالحة.',
      invalid_plan: 'الخطة غير صالحة.',
      slug_already_exists: 'هذا الـSlug مستخدم مسبقًا.',
      hostname_already_exists: 'هذا الدومين مستخدم مسبقًا.'
    };
    return (Array.isArray(errors) ? errors : [])
      .map(code => labels[code] || String(code))
      .join(' ');
  }

  async function client() {
    if (preflightClient) return preflightClient;
    const response = await fetch('/_restbr/platform-config', {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
    const config = await response.json().catch(() => ({}));
    if (!response.ok || !config?.ok || !config?.supabase_url || !config?.publishable_key) {
      throw new Error('تعذر تحميل إعدادات RESTBR Platform للـPreflight.');
    }
    preflightClient = window.supabase.createClient(
      config.supabase_url,
      config.publishable_key,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false
        }
      }
    );
    return preflightClient;
  }

  async function runPreflight(event) {
    if (allowNextSubmit) {
      allowNextSubmit = false;
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    const name = String($('restaurantName')?.value || '').trim();
    const slug = normalizeSlug($('restaurantSlug')?.value || '');
    const button = $('createRestaurantBtn');
    let handedOff = false;

    if (!name || slug.length < 2) {
      setMessage('اكتب اسم المطعم وSlug صالح مثل yourcoffee.', 'error');
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = 'جاري فحص الجاهزية...';
    }
    setMessage('Preflight: جاري التحقق من الاسم والـSlug والدومين والإعدادات بدون إنشاء أي سجل...');

    try {
      const c = await client();
      const { data, error } = await c.rpc('admin_create_restaurant_preview', {
        p_name: name,
        p_slug: slug,
        p_default_language: $('restaurantLanguage')?.value || 'ar',
        p_timezone: 'Asia/Baghdad',
        p_currency: String($('restaurantCurrency')?.value || 'IQD').trim() || 'IQD',
        p_phone: String($('restaurantPhone')?.value || '').trim(),
        p_whatsapp: String($('restaurantWhatsapp')?.value || '').trim(),
        p_plan: 'internal'
      });

      if (error) throw error;
      if (!data?.ok || data?.dry_run !== true) throw new Error('لم يرجع السيرفر نتيجة Preflight صحيحة.');

      if (!data.ready) {
        setMessage(`لم يتم إنشاء أي شيء. ${friendlyErrors(data.errors) || 'بيانات المطعم غير جاهزة للإنشاء.'}`, 'error');
        return;
      }

      const hostname = String(data?.target?.hostname || `${slug}.restbr.com`);
      setMessage(`Preflight ناجح ✓ — ${hostname} متاح. لم يتم إنشاء أي سجل بعد.`, 'success');

      const approved = window.confirm(
        `فحص الأمان نجح.\n\n` +
        `المطعم: ${data?.normalized?.name || name}\n` +
        `الدومين: ${hostname}\n\n` +
        `سيتم إنشاء:\n` +
        `• سجل المطعم\n• إعدادات مستقلة\n• دومين RESTBR\n• اشتراك Internal\n\n` +
        `المنيو سيبدأ فارغًا، ولا يتم إنشاء حساب منفصل للمطعم.\n\n` +
        `تنبيه: آلية الإنشاء الحالية تفعّل المطعم والدومين مباشرة. هذا لا يثبت بعد أن الـRouter المنشور استجاب للدومين الجديد.\n\n` +
        `هل تريد تنفيذ الإنشاء الآن؟`
      );

      if (!approved) {
        setMessage('تم إلغاء التنفيذ بعد Preflight. لم يتم إنشاء أي شيء.', 'success');
        return;
      }

      handedOff = true;
      allowNextSubmit = true;
      if (button) {
        button.disabled = false;
        button.textContent = 'إنشاء المطعم';
      }
      form.requestSubmit();
    } catch (error) {
      console.error('RESTBR onboarding preflight:', error);
      const msg = String(error?.message || error || 'فشل Preflight.');
      setMessage(`لم يتم إنشاء أي شيء — فشل Preflight: ${msg}`, 'error');
    } finally {
      if (!handedOff && button) {
        button.disabled = false;
        button.textContent = 'إنشاء المطعم';
      }
    }
  }

  // Capture phase runs before the existing admin.js submit handler.
  form.addEventListener('submit', runPreflight, true);
  console.log('✅ RESTBR onboarding preflight gate V1 ready');
})();
