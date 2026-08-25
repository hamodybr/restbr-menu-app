// RESTBR Super Admin — Onboarding Preflight Gate V1.2
// Safe flow: Preview -> Provision Draft -> Verify -> Explicit Activate.
(() => {
  'use strict';

  const form = document.getElementById('restaurantForm');
  if (!form || window.__RESTBR_ONBOARDING_PREFLIGHT_V1__) return;
  window.__RESTBR_ONBOARDING_PREFLIGHT_V1__ = true;

  let restbrClient = null;
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
      hostname_already_exists: 'هذا الدومين مستخدم مسبقًا.',
      restaurant_not_draft: 'المطعم ليس بحالة Draft.',
      settings_missing: 'إعدادات المطعم ناقصة.',
      primary_domain_missing: 'الدومين الرئيسي ناقص.',
      hostname_mismatch: 'الدومين لا يطابق الـSlug.',
      domain_kind_invalid: 'نوع الدومين غير صحيح.',
      domain_not_pending: 'الدومين ليس بحالة Pending.',
      subscription_missing: 'الاشتراك ناقص.',
      subscription_inactive: 'الاشتراك غير فعال.',
      router_origin_mismatch: 'Router origin غير صحيح.',
      router_base_path_mismatch: 'Router base path غير صحيح.'
    };
    return (Array.isArray(errors) ? errors : []).map(code => labels[code] || String(code)).join(' ');
  }

  async function client() {
    if (restbrClient) return restbrClient;
    const response = await fetch('/_restbr/platform-config', {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
    const config = await response.json().catch(() => ({}));
    if (!response.ok || !config?.ok || !config?.supabase_url || !config?.publishable_key) {
      throw new Error('تعذر تحميل إعدادات RESTBR Platform.');
    }
    restbrClient = window.supabase.createClient(config.supabase_url, config.publishable_key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
    return restbrClient;
  }

  function payloadFromForm() {
    return {
      p_name: String($('restaurantName')?.value || '').trim(),
      p_slug: normalizeSlug($('restaurantSlug')?.value || ''),
      p_default_language: $('restaurantLanguage')?.value || 'ar',
      p_timezone: 'Asia/Baghdad',
      p_currency: String($('restaurantCurrency')?.value || 'IQD').trim() || 'IQD',
      p_phone: String($('restaurantPhone')?.value || '').trim(),
      p_whatsapp: String($('restaurantWhatsapp')?.value || '').trim(),
      p_plan: 'internal'
    };
  }

  async function rpc(name, params) {
    const c = await client();
    const { data, error } = await c.rpc(name, params);
    if (error) throw error;
    return data;
  }

  async function verifyProvision(restaurantId) {
    const status = await rpc('admin_restaurant_provision_status', { p_restaurant_id: restaurantId });
    if (!status?.ok) throw new Error('تعذر التحقق من تهيئة المطعم.');
    return status;
  }

  async function activateProvision(restaurantId) {
    return rpc('admin_activate_restaurant', { p_restaurant_id: restaurantId });
  }

  async function runOnboarding(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const params = payloadFromForm();
    const button = $('createRestaurantBtn');

    if (!params.p_name || params.p_slug.length < 2) {
      setMessage('اكتب اسم المطعم وSlug صالح مثل yourcoffee.', 'error');
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = 'جاري فحص الجاهزية...';
    }

    try {
      setMessage('1/4 Preflight — فحص الاسم والـSlug والدومين بدون إنشاء أي سجل...');
      const preview = await rpc('admin_create_restaurant_preview', params);
      if (!preview?.ok || preview?.dry_run !== true) throw new Error('لم يرجع السيرفر نتيجة Preflight صحيحة.');
      if (!preview.ready) {
        setMessage(`لم يتم إنشاء أي شيء. ${friendlyErrors(preview.errors) || 'البيانات غير جاهزة.'}`, 'error');
        return;
      }

      const hostname = String(preview?.target?.hostname || `${params.p_slug}.restbr.com`);
      const approvedProvision = window.confirm(
        `Preflight ناجح ✓\n\n` +
        `المطعم: ${preview?.normalized?.name || params.p_name}\n` +
        `الدومين: ${hostname}\n\n` +
        `الخطوة التالية تنشئ المطعم كـ Draft فقط.\n` +
        `لن يظهر للعامة ولن يعمل الـRouter له قبل التفعيل النهائي.\n\n` +
        `سيتم إنشاء: Restaurant + Settings + Pending Domain + Internal Subscription.\n\n` +
        `هل تريد إنشاء الـDraft؟`
      );
      if (!approvedProvision) {
        setMessage('تم الإلغاء بعد Preflight. لم يتم إنشاء أي شيء.', 'success');
        return;
      }

      setMessage('2/4 Provision — جاري إنشاء المطعم كـ Draft والدومين كـ Pending...');
      const provision = await rpc('admin_provision_restaurant', params);
      if (!provision?.ok || !provision?.restaurant_id) throw new Error('فشل إنشاء Draft صالح.');

      const restaurantId = provision.restaurant_id;
      setMessage('3/4 Verify — تم إنشاء Draft. جاري فحص Settings / Domain / Subscription / Router target...');
      const verified = await verifyProvision(restaurantId);

      if (!verified.ready) {
        setMessage(
          `تم إنشاء المطعم كـ Draft فقط ولن يظهر للعامة. فشل Verify: ${friendlyErrors(verified.errors) || 'جاهزية غير مكتملة.'}`,
          'error'
        );
        setTimeout(() => location.reload(), 2200);
        return;
      }

      const approvedActivation = window.confirm(
        `Verify ناجح ✓\n\n` +
        `Settings: موجودة\n` +
        `Domain: ${verified?.domain?.hostname || hostname} — Pending\n` +
        `Subscription: ${verified?.subscription?.status || 'active'}\n` +
        `Menu seed: ${verified?.menu_seed?.categories || 0} أقسام / ${verified?.menu_seed?.products || 0} منتجات\n\n` +
        `الآن فقط يمكن تفعيل المطعم للعامة.\n\n` +
        `هل تريد Activate؟`
      );

      if (!approvedActivation) {
        setMessage(`تم حفظ ${hostname} كـ Draft آمن. لم يتم تفعيله للعامة.`, 'success');
        setTimeout(() => location.reload(), 1800);
        return;
      }

      setMessage('4/4 Activate — جاري التفعيل الذري للمطعم والدومين...');
      const activated = await activateProvision(restaurantId);
      if (!activated?.ok || activated?.activated !== true) throw new Error('لم يكتمل التفعيل النهائي.');

      setMessage(`تم تفعيل ${activated.hostname || hostname} بنجاح ✓`, 'success');
      setTimeout(() => location.reload(), 1400);
    } catch (error) {
      console.error('RESTBR staged onboarding:', error);
      setMessage(`توقف المسار بأمان: ${String(error?.message || error || 'خطأ غير معروف')}`, 'error');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'إنشاء المطعم';
      }
    }
  }

  async function handleDraftActivation(event) {
    const button = event.target.closest?.('[data-action="status"][data-status="active"]');
    if (!button) return;
    const card = button.closest('.restaurant-card');
    if (!card?.querySelector('.status-draft')) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const restaurantId = String(button.dataset.id || card.dataset.id || '').trim();
    if (!restaurantId) return;

    button.disabled = true;
    try {
      const verified = await verifyProvision(restaurantId);
      if (!verified.ready) {
        window.alert(`لا يمكن تفعيل Draft لأن Verify فشل:\n${friendlyErrors(verified.errors) || 'جاهزية غير مكتملة.'}`);
        return;
      }
      const hostname = verified?.domain?.hostname || verified?.domain?.expected_hostname || '';
      if (!window.confirm(`Verify ناجح لـ ${hostname}.\nهل تريد Activate الآن؟`)) return;
      const activated = await activateProvision(restaurantId);
      if (!activated?.ok) throw new Error('فشل التفعيل.');
      location.reload();
    } catch (error) {
      console.error('RESTBR draft activation:', error);
      window.alert(`تعذر تفعيل Draft: ${String(error?.message || error)}`);
    } finally {
      button.disabled = false;
    }
  }

  form.addEventListener('submit', runOnboarding, true);
  document.addEventListener('click', handleDraftActivation, true);
  console.log('✅ RESTBR staged onboarding V1.2 ready');
})();
