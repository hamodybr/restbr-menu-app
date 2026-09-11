(() => {
  if (window.__RESTBR_NUMBER_NORMALIZER_V1__) return;
  window.__RESTBR_NUMBER_NORMALIZER_V1__ = true;

  const NUMERIC_SELECTOR = [
    'input[type="number"]',
    'input[type="tel"]',
    'input[inputmode="numeric"]',
    'input[inputmode="decimal"]',
    'input[data-restbr-numeric]'
  ].join(',');
  const IS_ADMIN = /(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname);
  const UA = String(globalThis.navigator?.userAgent || '');
  const PLATFORM = String(globalThis.navigator?.platform || '');
  const TOUCH_POINTS = Number(globalThis.navigator?.maxTouchPoints || 0);
  const IS_IOS = /iP(?:hone|ad|od)/i.test(UA) || (PLATFORM === 'MacIntel' && TOUCH_POINTS > 1);
  const USE_IOS_TEXT_FALLBACK = IS_ADMIN && IS_IOS;
  const PREPARED = new WeakSet();

  function toEnglishDigits(value) {
    return String(value ?? '')
      .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
      .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776))
      .replace(/[０-９]/g, digit => String(digit.charCodeAt(0) - 65296));
  }

  function isNumericInput(input) {
    return input instanceof HTMLInputElement && input.matches(NUMERIC_SELECTOR);
  }

  function hasNumberSemantics(input) {
    return String(input?.type || '').toLowerCase() === 'number' ||
      input?.getAttribute?.('data-restbr-native-number') === '1';
  }

  function allowsDecimal(input) {
    const mode = String(input?.inputMode || '').toLowerCase();
    const step = String(input?.getAttribute?.('step') || '').trim().toLowerCase();
    return mode === 'decimal' || step === 'any' || /\./.test(step);
  }

  function sanitizeNumberLike(input, value) {
    let next = String(value ?? '').replace(/,/g, '');
    const negative = /^\s*-/.test(next);
    next = next.replace(/-/g, '');

    if (allowsDecimal(input)) {
      next = next.replace(/[^0-9.]/g, '');
      const firstDot = next.indexOf('.');
      if (firstDot >= 0) {
        next = next.slice(0, firstDot + 1) + next.slice(firstDot + 1).replace(/\./g, '');
      }
    } else {
      next = next.replace(/\D/g, '');
    }

    return (negative ? '-' : '') + next;
  }

  function normalizeForInput(input, value) {
    let next = toEnglishDigits(value);
    const type = String(input?.type || '').toLowerCase();
    const mode = String(input?.inputMode || '').toLowerCase();
    const numericMode = type === 'number' || mode === 'numeric' || mode === 'decimal' ||
      input?.hasAttribute?.('data-restbr-numeric');

    if (numericMode) {
      next = next
        .replace(/[٫]/g, '.')
        .replace(/[٬،]/g, ',');
      if (hasNumberSemantics(input)) next = sanitizeNumberLike(input, next);
    }
    return next;
  }

  function numericInputMode(input) {
    const step = String(input?.getAttribute?.('step') || '').trim().toLowerCase();
    return step === 'any' || /\./.test(step) ? 'decimal' : 'numeric';
  }

  function prepareInput(input) {
    if (!(input instanceof HTMLInputElement)) return false;
    if (PREPARED.has(input)) return isNumericInput(input);

    const isNumber = String(input.type || '').toLowerCase() === 'number';
    if (isNumber && !input.inputMode) input.inputMode = numericInputMode(input);

    // Mobile Safari can reject Arabic/Persian glyphs in a native number field
    // before JavaScript receives a useful value. Use a text-backed numeric field
    // on the admin page while preserving the field's original numeric semantics.
    if (USE_IOS_TEXT_FALLBACK && isNumber) {
      input.setAttribute('data-restbr-native-number', '1');
      input.setAttribute('data-restbr-numeric', '');
      input.type = 'text';
      input.inputMode = numericInputMode(input);
      input.autocapitalize = 'off';
      input.spellcheck = false;
    }

    const numeric = isNumericInput(input);
    if (numeric) {
      input.lang = 'en';
      input.dir = 'ltr';
    }
    PREPARED.add(input);
    return numeric;
  }

  function normalizeCurrent(input) {
    if (!(input instanceof HTMLInputElement)) return false;
    if (!prepareInput(input)) return false;

    const current = String(input.value ?? '');
    const normalized = normalizeForInput(input, current);
    if (normalized === current) return false;

    const start = input.selectionStart;
    const end = input.selectionEnd;
    input.value = normalized;

    try {
      if (Number.isInteger(start) && Number.isInteger(end) && input.type !== 'number') {
        const shift = current.length - normalized.length;
        input.setSelectionRange(Math.max(0, start - shift), Math.max(0, end - shift));
      }
    } catch (_) {}

    return true;
  }

  function emitNativeCompatibleInput(input, inputType = 'insertText', data = null) {
    try {
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType, data }));
    } catch (_) {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function insertIntoNativeNumber(input, text, inputType = 'insertText') {
    if (String(input?.type || '').toLowerCase() !== 'number') return;
    const normalized = normalizeForInput(input, text);
    input.value = normalizeForInput(input, `${input.value || ''}${normalized}`);
    emitNativeCompatibleInput(input, inputType, normalized);
  }

  function enhance(root = document) {
    const inputs = root instanceof HTMLInputElement
      ? [root]
      : [...(root.querySelectorAll?.(NUMERIC_SELECTOR) || [])];

    inputs.forEach(input => {
      prepareInput(input);
      normalizeCurrent(input);
    });
  }

  // Delegated listeners mean dynamically-created dashboard inputs need no global
  // MutationObserver. A field is prepared immediately when it receives focus.
  document.addEventListener('focusin', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    prepareInput(input);
    normalizeCurrent(input);
  }, true);

  document.addEventListener('input', event => {
    normalizeCurrent(event.target);
  }, true);

  document.addEventListener('change', event => {
    normalizeCurrent(event.target);
  }, true);

  document.addEventListener('compositionend', event => {
    normalizeCurrent(event.target);
  }, true);

  // Non-iOS compatibility path for native number fields that reject localized
  // glyphs before a normal input event is produced.
  document.addEventListener('beforeinput', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    prepareInput(input);
    if (USE_IOS_TEXT_FALLBACK || String(input.type || '').toLowerCase() !== 'number') return;
    if (typeof event.data !== 'string' || !/[٠-٩۰-۹０-９٫٬،]/.test(event.data)) return;

    const normalized = normalizeForInput(input, event.data);
    if (!normalized || normalized === event.data) return;
    event.preventDefault();
    insertIntoNativeNumber(input, normalized, event.inputType || 'insertText');
  }, true);

  document.addEventListener('paste', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    prepareInput(input);
    if (USE_IOS_TEXT_FALLBACK || String(input.type || '').toLowerCase() !== 'number') return;

    const pasted = event.clipboardData?.getData('text') || '';
    if (!/[٠-٩۰-۹０-９٫٬،]/.test(pasted)) return;

    const normalized = normalizeForInput(input, pasted);
    if (!normalized || normalized === pasted) return;
    event.preventDefault();
    insertIntoNativeNumber(input, normalized, 'insertFromPaste');
  }, true);

  const boot = () => enhance(document);

  window.RESTBR_TO_ENGLISH_DIGITS = toEnglishDigits;
  window.RESTBR_NORMALIZE_NUMERIC_INPUT = normalizeCurrent;
  window.RESTBR_IOS_NUMERIC_FALLBACK_ACTIVE = USE_IOS_TEXT_FALLBACK;
  window.RESTBR_NUMERIC_FAST_PATH_V2 = true;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
