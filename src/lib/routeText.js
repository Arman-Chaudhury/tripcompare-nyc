// Translations for route content: option names, steps, tips, warnings, trip
// notes, and cost-breakdown labels. The engine (lib/options.js, data/*) stays
// English; the tabs run its output through localizeOption() for the display
// language, so the data files never need to know about languages.
//
// Dictionaries map the exact English string to a translation. Strings that
// carry numbers or names use `{placeholder}` templates: "Tolls ({mi} mi)"
// matches any value, and the captured value is substituted into the
// translation (and itself translated if it has an entry, e.g. a surge label).
// Line letters, station names, app names, and dollar amounts are kept as-is on
// purpose: they must match the signs the passenger will be reading.

import es from '../data/routeText/es.js';
import zh from '../data/routeText/zh.js';

const DICTS = { es, zh };
const compiled = new Map(); // lang → [{ re, names, out }]

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function templatesFor(lang) {
  if (compiled.has(lang)) return compiled.get(lang);
  const list = [];
  for (const [key, out] of Object.entries(DICTS[lang] ?? {})) {
    if (!key.includes('{')) continue;
    const names = [];
    const src = escapeRe(key).replace(/\\\{(\w+)\\\}/g, (_, n) => { names.push(n); return '(.+?)'; });
    list.push({ re: new RegExp(`^${src}$`), names, out });
  }
  compiled.set(lang, list);
  return list;
}

/** Translate one engine string; returns the input unchanged when no entry matches. */
export function tx(lang, s) {
  if (!s || lang === 'en' || !DICTS[lang]) return s;
  const dict = DICTS[lang];
  if (Object.hasOwn(dict, s)) return dict[s];
  for (const { re, names, out } of templatesFor(lang)) {
    const m = re.exec(s);
    if (!m) continue;
    const vars = {};
    names.forEach((n, i) => { if (!(n in vars)) vars[n] = tx(lang, m[i + 1]); });
    return out.replace(/\{(\w+)\}/g, (_, n) => vars[n] ?? `{${n}}`);
  }
  return s;
}

/** True when `s` has an exact or template entry in `lang` (for coverage checks). */
export function hasTranslation(lang, s) {
  if (!DICTS[lang]) return false;
  if (Object.hasOwn(DICTS[lang], s)) return true;
  return templatesFor(lang).some(({ re }) => re.test(s));
}

export const routeTextLanguages = Object.keys(DICTS);

export function localizeOption(o, lang) {
  if (lang === 'en' || !DICTS[lang]) return o;
  const T = (s) => tx(lang, s);
  return {
    ...o,
    name: T(o.name),
    steps: o.steps?.map(T),
    tips: o.tips?.map(T),
    warnings: o.warnings.map((w) => ({ ...w, text: T(w.text) })),
    breakdown: o.breakdown.map((b) => ({ ...b, label: T(b.label) })),
    promo: o.promo ? { ...o.promo, label: T(o.promo.label) } : o.promo,
  };
}

export const localizeOptions = (options, lang) => (lang === 'en' ? options : options.map((o) => localizeOption(o, lang)));
export const localizeNotes = (notes, lang) => (lang === 'en' ? notes : notes.map((n) => tx(lang, n)));
