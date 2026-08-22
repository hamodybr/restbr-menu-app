// ==========================================
// RESTBR DESIGN SYSTEM V1.1
// Tenant-specific visual settings + animated background effect
// ==========================================

(() => {
  'use strict';

  const root = document.documentElement;

  function has(v) {
    return v !== null && v !== undefined && String(v).trim() !== '';
  }

  function num(v, min, max) {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.min(max, Math.max(min, n));
  }

  function css(name, value) {
    if (!has(value)) return;
    root.style.setProperty(name, String(value));
  }

  function px(name, value, min = 0, max = 500) {
    const n = num(value, min, max);
    if (n === null) return;
    css(name, `${n}px`);
  }

  function pct(name, value, min = 0, max = 100) {
    const n = num(value, min, max);
    if (n === null) return;
    css(name, `${n}%`);
  }

  function alpha(value, fallback = null) {
    if (!has(value)) return fallback;
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(1, Math.max(0, n > 1 ? n / 100 : n));
  }

  function hexToRgb(hex) {
    const s = String(hex || '').trim().replace('#', '');
    if (!/^[0-9a-f]{6}$/i.test(s)) return null;
    return {
      r: parseInt(s.slice(0, 2), 16),
      g: parseInt(s.slice(2, 4), 16),
      b: parseInt(s.slice(4, 6), 16)
    };
  }

  function rgba(hex, a) {
    const rgb = hexToRgb(hex);
    if (!rgb) return null;
    return `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`;
  }

  function ensureStyle() {
    let injected = document.getElementById('restbrDesignSystemV11');
    if (injected) return injected;

    injected = document.createElement('style');
    injected.id = 'restbrDesignSystemV11';
    injected.textContent = `
      :root {
        --restbr-accent: #d7a64a;
        --restbr-text-primary: #fff;
        --restbr-text-muted: rgba(255,255,255,.68);
        --restbr-card-bg: rgba(8,6,4,.12);
        --restbr-card-border: rgba(215,166,74,.58);
        --restbr-button-border: rgba(215,166,74,.58);
        --restbr-card-blur: 14px;
        --restbr-card-shadow: 0 14px 42px rgba(0,0,0,.28);
      }

      body {
        font-family: var(--restbr-font-family, inherit) !important;
      }

      .sm-header h1,
      .sm-menu h2,
      .sm-section-title,
      .sm-footer h2 {
        font-family: var(--restbr-heading-font-family, var(--restbr-font-family, inherit)) !important;
      }

      .sm-card,
      .sm-footer-card {
        background: var(--restbr-card-bg) !important;
        border-color: var(--restbr-card-border) !important;
        backdrop-filter: blur(var(--restbr-card-blur)) saturate(132%) !important;
        -webkit-backdrop-filter: blur(var(--restbr-card-blur)) saturate(132%) !important;
        box-shadow: var(--restbr-card-shadow) !important;
        position: relative;
        overflow: hidden;
      }

      .sm-card::before,
      .sm-footer-card::before {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        pointer-events: none;
        background:
          linear-gradient(135deg, rgba(255,255,255,.10), transparent 28%),
          linear-gradient(315deg, rgba(255,255,255,.035), transparent 40%);
        mix-blend-mode: screen;
        opacity: .75;
      }

      .sm-card h3,
      .sm-card .sm-name,
      .sm-footer h2 {
        color: var(--restbr-text-primary) !important;
      }

      .sm-card,
      .sm-card p,
      .sm-card small,
      .sm-footer,
      .sm-footer p {
        color: var(--restbr-text-muted);
      }

      .sm-price,
      .sm-card .price,
      .sm-footer-phone,
      .sm-section-title::after {
        color: var(--restbr-accent) !important;
      }

      .sm-actions a,
      .sm-actions button,
      .sm-footer a,
      .sm-cats button,
      .sm-cat,
      .sm-add-btn,
      .sm-choice-btn,
      .sm-top-btn {
        border-color: var(--restbr-button-border) !important;
      }

      .sm-cats .active,
      .sm-cat.active,
      .sm-cats button[aria-current="true"] {
        background: var(--restbr-accent) !important;
      }

      /* Animated test background for a single tenant only. */
      html[data-restbr-bg="coffee-aurora"] .sm-bg-video {
        opacity: 0 !important;
      }

      html[data-restbr-bg="coffee-aurora"] .sm-bg-overlay {
        opacity: 1 !important;
        background:
          radial-gradient(circle at 18% 18%, rgba(194,112,49,.85) 0 8%, transparent 28%),
          radial-gradient(circle at 82% 28%, rgba(104,52,20,.75) 0 10%, transparent 30%),
          radial-gradient(circle at 48% 62%, rgba(219,151,84,.48) 0 8%, transparent 26%),
          radial-gradient(circle at 76% 82%, rgba(84,35,12,.85) 0 11%, transparent 32%),
          linear-gradient(145deg, #080402 0%, #1d0e07 42%, #080402 100%) !important;
        background-size: 155% 155%, 145% 145%, 160% 160%, 150% 150%, 100% 100% !important;
        animation: restbrCoffeeAurora 12s ease-in-out infinite alternate !important;
      }

      html[data-restbr-bg="coffee-aurora"] .sm-bg-overlay::after {
        content: "";
        position: absolute;
        inset: 0;
        background:
          repeating-linear-gradient(
            118deg,
            rgba(255,255,255,.018) 0 1px,
            transparent 1px 7px
          ),
          radial-gradient(circle at 50% 50%, transparent 0 42%, rgba(0,0,0,.38) 100%);
        pointer-events: none;
      }

      @keyframes restbrCoffeeAurora {
        0% {
          background-position: 0% 0%, 100% 0%, 30% 100%, 100% 100%, 0 0;
          filter: saturate(1.05) brightness(.92);
        }
        50% {
          background-position: 22% 14%, 82% 20%, 55% 76%, 72% 88%, 0 0;
          filter: saturate(1.18) brightness(1.02);
        }
        100% {
          background-position: 38% 26%, 64% 36%, 72% 58%, 54% 70%, 0 0;
          filter: saturate(1.1) brightness(.96);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        html[data-restbr-bg="coffee-aurora"] .sm-bg-overlay {
          animation: none !important;
        }
      }
    `;
    document.head.appendChild(injected);
    return injected;
  }

  function apply(settings = {}) {
    const ui = settings.ui_design_settings && typeof settings.ui_design_settings === 'object'
      ? settings.ui_design_settings
      : {};

    if (!Object.keys(ui).length) return;

    ensureStyle();

    root.dataset.restbrTheme = ui.preset || 'custom';

    if (has(ui.background_effect)) {
      root.dataset.restbrBg = String(ui.background_effect);
    } else {
      delete root.dataset.restbrBg;
    }

    px('--sm-ui-card-height', ui.card_height, 100, 420);
    pct('--sm-ui-image-percent', ui.image_percent, 20, 80);
    px('--sm-ui-card-radius', ui.card_radius, 0, 60);
    px('--sm-ui-card-gap', ui.card_gap, 0, 50);
    px('--sm-ui-info-padding', ui.info_padding, 0, 50);
    px('--sm-ui-product-name-font', ui.product_name_font, 8, 40);
    px('--sm-ui-option-font', ui.option_font, 8, 30);
    px('--sm-ui-price-font', ui.price_font, 8, 36);
    px('--sm-ui-section-title-font', ui.section_title_font, 12, 60);
    px('--sm-ui-add-button-height', ui.add_button_height, 22, 80);
    px('--sm-ui-add-button-font', ui.add_button_font, 8, 28);
    px('--sm-ui-category-height', ui.category_height, 28, 80);
    px('--sm-ui-category-font', ui.category_font, 8, 26);
    px('--sm-ui-top-action-height', ui.top_action_height, 30, 90);
    px('--sm-ui-top-action-font', ui.top_action_font, 8, 28);
    px('--sm-ui-cart-width', ui.cart_width, 100, 360);
    px('--sm-ui-cart-height', ui.cart_height, 36, 100);
    px('--sm-ui-cart-font', ui.cart_font, 9, 30);
    px('--sm-ui-cart-bottom', ui.cart_bottom, 0, 100);
    px('--sm-ui-logo-size', ui.logo_size, 30, 220);
    px('--sm-ui-menu-title-font', ui.menu_title_font, 14, 60);
    px('--sm-ui-subtitle-font', ui.subtitle_font, 8, 32);
    px('--sm-ui-search-height', ui.search_height, 30, 80);
    px('--sm-ui-search-font', ui.search_font, 10, 28);
    px('--sm-ui-footer-title-font', ui.footer_title_font, 10, 40);
    px('--sm-ui-footer-action-font', ui.footer_action_font, 8, 28);
    px('--sm-ui-footer-phone-font', ui.footer_phone_font, 10, 40);

    if (has(ui.accent_color)) css('--restbr-accent', ui.accent_color);
    if (has(ui.text_primary)) css('--restbr-text-primary', ui.text_primary);
    if (has(ui.text_muted)) css('--restbr-text-muted', ui.text_muted);
    if (has(ui.card_border_color)) css('--restbr-card-border', ui.card_border_color);
    if (has(ui.button_border_color)) css('--restbr-button-border', ui.button_border_color);

    const glassOpacity = alpha(ui.card_glass_opacity ?? ui.card_glass_transparency);
    const glassBase = has(ui.card_glass_color) ? ui.card_glass_color : '#080604';
    if (glassOpacity !== null) {
      const value = rgba(glassBase, glassOpacity);
      if (value) css('--restbr-card-bg', value);
    }

    const blur = num(ui.card_glass_blur, 0, 40);
    if (blur !== null) css('--restbr-card-blur', `${blur}px`);

    const shadow = num(ui.card_shadow_strength, 0, 100);
    if (shadow !== null) css('--restbr-card-shadow', `0 14px 42px rgba(0,0,0,${shadow / 100})`);

    if (has(ui.font_family)) css('--restbr-font-family', ui.font_family);
    if (has(ui.heading_font_family)) css('--restbr-heading-font-family', ui.heading_font_family);

    window.RESTBR_DESIGN_SETTINGS = ui;
    window.dispatchEvent(new CustomEvent('restbr:design-applied', { detail: ui }));
  }

  async function boot() {
    try {
      if (typeof window.RESTBR_LOAD_BOOTSTRAP !== 'function') return;
      const payload = await window.RESTBR_LOAD_BOOTSTRAP();
      apply(payload?.settings || {});
    } catch (error) {
      console.warn('RESTBR Design System V1.1 could not apply:', error);
    }
  }

  window.RESTBR_APPLY_DESIGN = apply;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
