// RESTBR URL safety guard
// Restricts restaurant-configured links/media to safe URL schemes.
(() => {
  if (window.__RESTBR_URL_SAFETY_V1__) return;
  window.__RESTBR_URL_SAFETY_V1__ = true;

  const ALLOWED_SCHEMES = new Set(['http:', 'https:', 'tel:', 'mailto:', 'geo:']);
  const SAFE_MEDIA_SCHEMES = new Set(['http:', 'https:']);
  const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;
  const RAW_WHITESPACE = /[\s\u00A0]/u;

  const CONFIGURED_LINK_SELECTOR = [
    '#smActions a', '#smFooterLocation', '#smFooterCall', '#smFooterWhatsapp',
    '#smFacebook', '#smSnapchat', '#smTikTok', '#smInstagram',
    'a.sm-custom-footer-action', 'a.sm-custom-social-link'
  ].join(', ');

  function safeConfiguredUrl(value) {
    const raw = String(value ?? '').trim();
    if (!raw || CONTROL_CHARACTERS.test(raw) || RAW_WHITESPACE.test(raw)) return '';
    if (raw.startsWith('#') || (raw.startsWith('/') && !raw.startsWith('//')) || raw.startsWith('./') || raw.startsWith('../')) return raw;
    if (raw.startsWith('//')) return '';
    const match = raw.match(/^([a-z][a-z0-9+.-]*:)/i);
    if (!match) return '';
    const scheme = match[1].toLowerCase();
    if (!ALLOWED_SCHEMES.has(scheme)) return '';
    try {
      const parsed = new URL(raw, window.location.href);
      return ALLOWED_SCHEMES.has(parsed.protocol.toLowerCase()) ? raw : '';
    } catch (_) {
      return ['tel:', 'mailto:', 'geo:'].includes(scheme) ? raw : '';
    }
  }

  function safeMediaUrl(value) {
    const raw = String(value ?? '').trim();
    if (!raw || CONTROL_CHARACTERS.test(raw) || RAW_WHITESPACE.test(raw)) return '';
    if (raw.startsWith('//') || raw.startsWith('\\')) return '';
    const match = raw.match(/^([a-z][a-z0-9+.-]*:)/i);
    if (!match) return raw.startsWith('#') ? '' : raw;
    const scheme = match[1].toLowerCase();
    if (!SAFE_MEDIA_SCHEMES.has(scheme)) return '';
    try {
      const parsed = new URL(raw, window.location.href);
      return SAFE_MEDIA_SCHEMES.has(parsed.protocol.toLowerCase()) ? raw : '';
    } catch (_) { return ''; }
  }

  window.RESTBR_SAFE_CONFIGURED_URL = safeConfiguredUrl;
  window.RESTBR_SAFE_MEDIA_URL = safeMediaUrl;
})();
