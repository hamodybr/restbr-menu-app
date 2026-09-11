import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('js/number-normalizer.js', 'utf8');

function createRuntime(pathname, navigatorInfo = {}) {
  const listeners = new Map();

  class FakeInput {
    constructor(type = 'number') {
      this.type = type;
      this.value = '';
      this.inputMode = '';
      this.lang = '';
      this.dir = '';
      this.events = [];
      this.selectionStart = 0;
      this.selectionEnd = 0;
      this.attributes = new Map();
      this.autocapitalize = '';
      this.spellcheck = true;
    }
    matches() { return true; }
    hasAttribute(name) { return this.attributes.has(name); }
    getAttribute(name) { return this.attributes.get(name) ?? ''; }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    setSelectionRange(start, end) {
      this.selectionStart = start;
      this.selectionEnd = end;
    }
    dispatchEvent(event) { this.events.push(event); return true; }
  }

  class FakeEvent {
    constructor(type, init = {}) { this.type = type; Object.assign(this, init); }
  }

  const document = {
    readyState: 'complete',
    addEventListener(type, callback) { listeners.set(type, callback); },
    querySelectorAll() { return []; }
  };

  const window = {};
  const navigator = {
    userAgent: '',
    platform: '',
    maxTouchPoints: 0,
    ...navigatorInfo
  };

  vm.runInNewContext(source, {
    window,
    document,
    navigator,
    location: { pathname },
    HTMLInputElement: FakeInput,
    Event: FakeEvent,
    InputEvent: FakeEvent,
    WeakSet,
    console
  });

  return { listeners, FakeInput, window };
}

// Non-iOS native number fields keep working with Arabic/Persian digits.
const generic = createRuntime('/');
const nativeNumber = new generic.FakeInput('number');
const beforeInput = generic.listeners.get('beforeinput');

for (const [localized, expected] of [['١', '1'], ['٢', '12'], ['۳', '123'], ['٤', '1234']]) {
  let prevented = false;
  beforeInput({
    target: nativeNumber,
    data: localized,
    inputType: 'insertText',
    preventDefault() { prevented = true; }
  });

  if (!prevented || nativeNumber.value !== expected) {
    throw new Error(`Localized native-number fallback failed: ${localized} produced ${nativeNumber.value}, expected ${expected}`);
  }
}

// Simulate iPhone admin: native type=number must become a text-backed numeric
// field before the software keyboard inserts Arabic/Persian glyphs.
const iosAdmin = createRuntime('/admin', {
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
  platform: 'iPhone',
  maxTouchPoints: 5
});
const iosPrice = new iosAdmin.FakeInput('number');
iosPrice.setAttribute('min', '0');
iosPrice.setAttribute('step', '1');

iosAdmin.listeners.get('focusin')({ target: iosPrice });
if (
  iosPrice.type !== 'text' ||
  iosPrice.getAttribute('data-restbr-native-number') !== '1' ||
  iosPrice.inputMode !== 'numeric'
) {
  throw new Error(`iOS numeric fallback was not armed before keyboard input: type=${iosPrice.type}, mode=${iosPrice.inputMode}`);
}
if (iosAdmin.window.RESTBR_IOS_NUMERIC_FALLBACK_ACTIVE !== true) {
  throw new Error('iOS numeric fallback flag is not active');
}
if (iosAdmin.window.RESTBR_NUMERIC_FAST_PATH_V2 !== true) {
  throw new Error('iOS single-event fast path is not enabled');
}

const iosBeforeInput = iosAdmin.listeners.get('beforeinput');
const iosInput = iosAdmin.listeners.get('input');
for (const [localized, expected] of [['١', '1'], ['٢', '12'], ['۳', '123'], ['٤', '1234']]) {
  let prevented = false;
  iosBeforeInput({
    target: iosPrice,
    data: localized,
    inputType: 'insertText',
    preventDefault() { prevented = true; }
  });
  if (prevented) throw new Error(`iPhone fast path incorrectly prevented native input for ${localized}`);

  iosPrice.value += localized;
  iosPrice.selectionStart = iosPrice.selectionEnd = iosPrice.value.length;
  iosInput({ target: iosPrice });

  if (iosPrice.value !== expected) {
    throw new Error(`iPhone Arabic typing failed: ${localized} produced ${iosPrice.value}, expected ${expected}`);
  }
  if (iosPrice.events.length !== 0) {
    throw new Error(`iPhone path dispatched ${iosPrice.events.length} synthetic input event(s)`);
  }
}

iosPrice.value = '';
iosPrice.selectionStart = iosPrice.selectionEnd = 0;
for (const [localized, expected] of [['۱', '1'], ['۲', '12'], ['۳', '123']]) {
  iosPrice.value += localized;
  iosPrice.selectionStart = iosPrice.selectionEnd = iosPrice.value.length;
  iosInput({ target: iosPrice });
  if (iosPrice.value !== expected) {
    throw new Error(`iPhone Persian typing failed: ${localized} produced ${iosPrice.value}, expected ${expected}`);
  }
}

if (iosAdmin.window.RESTBR_TO_ENGLISH_DIGITS('١٢۳４') !== '1234') {
  throw new Error('Arabic/Persian/fullwidth digit conversion failed');
}

console.log('✓ RESTBR Arabic/Persian numeric input and iPhone single-event fast path passed');
