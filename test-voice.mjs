/**
 * Standalone test for the voice parser logic.
 * Run with: node test-voice.mjs
 */
import { format, subDays } from './node_modules/date-fns/index.js';

// ── Mirrors voiceService.ts exactly ─────────────────────────────────────────

const HEBREW_NUMBERS = {
  אחת:1, אחד:1, שתיים:2, שניים:2, שתי:2,
  שלוש:3, שלושה:3, ארבע:4, ארבעה:4,
  חמש:5, חמישה:5, שש:6, שישה:6,
  שבע:7, שבעה:7, שמונה:8,
  תשע:9, תשעה:9, עשר:10, עשרה:10,
};

const HEBREW_MONTHS = {
  ינואר:1, פברואר:2, מרץ:3, אפריל:4, מאי:5, יוני:6,
  יולי:7, אוגוסט:8, ספטמבר:9, אוקטובר:10, נובמבר:11, דצמבר:12,
};

const HEBREW_DAYS = {
  ראשון:0, שני:1, שלישי:2, רביעי:3, חמישי:4, שישי:5, שבת:6,
};

function parseFraction(t) {
  if (/ושלושה\s+רבעים|ו?שלושת\s+רבעי/.test(t)) return 0.75;
  if (/וחצי/.test(t)) return 0.5;
  if (/ורבע/.test(t))  return 0.25;
  return 0;
}

function parseHours(t) {
  if (/חצי\s+שעה/.test(t)        && !/שעות|שעה\s+וחצי|שעתיים/.test(t)) return 0.5;
  if (/רבע\s+שעה/.test(t)         && !/שעות|שעה\s+ורבע|שעתיים/.test(t))  return 0.25;
  if (/שלושת\s+רבעי\s+שעה/.test(t))  return 0.75;
  if (/שעתיים/.test(t))            return 2 + parseFraction(t);
  if (/שעה/.test(t) && !/שעות/.test(t)) return 1 + parseFraction(t);
  const d = t.match(/(\d+(?:\.\d+)?)\s*שעות?/);
  if (d) return parseFloat(d[1]) + parseFraction(t);
  for (const [w, v] of Object.entries(HEBREW_NUMBERS))
    if (new RegExp(w + '\\s+שעות?').test(t)) return v + parseFraction(t);
  const m = t.match(/(\d+)\s*דקות?/);
  if (m) return Math.round((parseInt(m[1]) / 60) * 4) / 4;
  return undefined;
}

function parseDateExplicit(t) {
  const mn  = Object.keys(HEBREW_MONTHS).join('|');
  const rx  = new RegExp(`(?:ה-?)?(\\d{1,2})\\s+[לב](${mn})(?:\\s+(\\d{4}))?`);
  const match = t.match(rx);
  if (!match) return undefined;
  const day   = parseInt(match[1]);
  const month = HEBREW_MONTHS[match[2]];
  if (!month || day < 1 || day > 31) return undefined;
  const cy   = new Date().getFullYear();
  const year = match[3] ? parseInt(match[3]) : cy;
  return format(new Date(year, month - 1, day), 'yyyy-MM-dd');
}

function parseDate(t) {
  const today = new Date();
  if (/היום/.test(t))   return format(today, 'yyyy-MM-dd');
  if (/אתמול/.test(t))  return format(subDays(today, 1), 'yyyy-MM-dd');
  if (/שלשום/.test(t))  return format(subDays(today, 2), 'yyyy-MM-dd');
  const ex = parseDateExplicit(t);
  if (ex) return ex;
  for (const [dn, td] of Object.entries(HEBREW_DAYS)) {
    if (new RegExp(`(?:ביום\\s+|יום\\s+)${dn}`).test(t)) {
      let db = today.getDay() - td;
      if (db <= 0) db += 7;
      return format(subDays(today, db), 'yyyy-MM-dd');
    }
  }
  return undefined;
}

function parseClient(t, clients) {
  const sorted = [...clients].sort((a, b) => b.length - a.length);
  for (const c of sorted) {
    const esc = c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(esc, 'i').test(t)) return c;
  }
  const stopWords = /\s+(?:היום|אתמול|שלשום|ביום|יום|ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת|שעתיים|שעה|חצי|רבע|\d+\s*(?:שעות?|דקות?)).*$/;
  for (const p of [
    /ללקוח\s+([^\s,]+(?:\s+[^\s,]+)?)/,
    /עבור\s+לקוח\s+([^\s,]+(?:\s+[^\s,]+)?)/,
    /לקוח\s+([^\s,]+(?:\s+[^\s,]+)?)/,
    /אצל\s+([^\s,]+(?:\s+[^\s,]+)?)/,
    /עבור\s+([^\s,]+(?:\s+[^\s,]+)?)/,
  ]) {
    const m = t.match(p);
    if (m) return m[1].replace(stopWords, '').trim();
  }
  return undefined;
}

function parseStandaloneNumber(t) {
  const mn = Object.keys(HEBREW_MONTHS).join('|');
  const cleaned = t
    .replace(new RegExp(`(?:ה-?)?\\d{1,2}\\s+[לב](?:${mn})(?:\\s+\\d{4})?`, 'g'), ' ')
    .replace(/\b\d{4}\b/g, ' ')
    .replace(/\d+(?:\.\d+)?\s*(?:שעות?|דקות?)/g, ' ');
  const m = cleaned.match(/\b(\d+)\b/);
  return m ? parseInt(m[1], 10) : null;
}

function parseDescription(t, client, consumedNumber = null) {
  let d = t;
  if (client) {
    const esc = client.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    d = d.replace(new RegExp(esc, 'gi'), '');
  }
  d = d.replace(/(?:ללקוח|עבור\s+לקוח|לקוח|עבור|אצל|של)\s+[^\s,]+(?:\s+[^\s,]+)?/g, '');
  d = d.replace(/שלושת\s+רבעי\s+שעה|חצי\s+שעה|רבע\s+שעה/g, '');
  d = d.replace(/שעתיים(?:\s+(?:וחצי|ורבע|ושלושה\s+רבעים))?/g, '');
  d = d.replace(/שעה(?:\s+(?:וחצי|ורבע|ושלושה\s+רבעים))?/g, '');
  d = d.replace(/\d+(?:\.\d+)?\s*שעות?(?:\s+(?:וחצי|ורבע|ושלושה\s+רבעים))?/g, '');
  d = d.replace(/[א-ת]+\s+שעות?(?:\s+(?:וחצי|ורבע))?/g, '');
  d = d.replace(/\d+\s*דקות?/g, '');
  d = d.replace(/(?:וחצי|ורבע|ושלושה\s+רבעים)/g, '');
  const mn = Object.keys(HEBREW_MONTHS).join('|');
  d = d.replace(new RegExp(`(?:ה-?)?\\d{1,2}\\s+[לב](?:${mn})(?:\\s+\\d{4})?`, 'g'), '');
  d = d.replace(/(?:ביום\s+|יום\s+)?(?:ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)/g, '');
  d = d.replace(/היום|אתמול|שלשום/g, '');
  d = d.replace(/\b(?:על|ב|את|עם|ל)\s+/g, '');
  if (consumedNumber !== null) {
    d = d.replace(new RegExp(`\\b${consumedNumber}\\b`, 'g'), '');
  }
  return d.replace(/\s{2,}/g, ' ').trim() || undefined;
}

function parse(transcript, clients = []) {
  const t = transcript.trim();
  const client = parseClient(t, clients);
  let hours = parseHours(t);
  let work_date = parseDate(t);
  let consumedStandalone = null;
  const standalone = parseStandaloneNumber(t);
  if (standalone !== null) {
    if (hours === undefined && standalone >= 0.25 && standalone <= 24) {
      hours = standalone;
      consumedStandalone = standalone;
    } else if (hours !== undefined && work_date === undefined && standalone >= 1 && standalone <= 31) {
      const today = new Date();
      let d = new Date(today.getFullYear(), today.getMonth(), standalone);
      if (d > today) d = new Date(today.getFullYear(), today.getMonth() - 1, standalone);
      work_date = format(d, 'yyyy-MM-dd');
      consumedStandalone = standalone;
    }
  }
  return { client, work_date, hours, description: parseDescription(t, client, consumedStandalone) };
}

// ── Test suite ───────────────────────────────────────────────────────────────

const CLIENTS = ['ממורנד','יאיר',"צ'יקי",'מנדי','אורי רז','קייזר','כללית','שולי רכדינר','שמואל קבילי','ליאב'];
const TODAY     = format(new Date(), 'yyyy-MM-dd');
const YESTERDAY = format(subDays(new Date(), 1), 'yyyy-MM-dd');
const TWO_AGO   = format(subDays(new Date(), 2), 'yyyy-MM-dd');

const tests = [
  // ── relative dates ───────────────────────────────────────────────────────
  { in: 'ממורנד היום 3 שעות ישיבת צוות',
    client:'ממורנד', date:TODAY,      hours:3,    desc:'ישיבת צוות' },
  { in: 'קייזר אתמול שעתיים וחצי הצעת מחיר',
    client:'קייזר',  date:YESTERDAY,  hours:2.5,  desc:'הצעת מחיר' },
  { in: 'ליאב שלשום שעה ורבע תיקון באגים',
    client:'ליאב',   date:TWO_AGO,    hours:1.25, desc:'תיקון באגים' },

  // ── explicit day + month ─────────────────────────────────────────────────
  { in: 'ממורנד 16 לפברואר שלוש שעות סקירת קוד',
    client:'ממורנד', date:'2026-02-16', hours:3,   desc:'סקירת קוד' },
  { in: 'כללית ה-5 במרץ שעתיים דוח חודשי',
    client:'כללית',  date:'2026-03-05', hours:2,   desc:'דוח חודשי' },
  { in: 'יאיר 1 לינואר שעה',
    client:'יאיר',   date:'2026-01-01', hours:1,   desc: undefined },
  { in: 'מנדי 20 לפברואר 2026 חצי שעה שיחת טלפון',
    client:'מנדי',   date:'2026-02-20', hours:0.5, desc:'שיחת טלפון' },

  // ── day of week ──────────────────────────────────────────────────────────
  { in: 'אורי רז יום חמישי ארבע שעות',
    client:'אורי רז', date:'dow', hours:4, desc: undefined },

  // ── fractions and minutes ────────────────────────────────────────────────
  { in: 'מנדי היום חצי שעה שיחת טלפון',
    client:'מנדי',   date:TODAY,     hours:0.5,  desc:'שיחת טלפון' },
  { in: 'שולי רכדינר אתמול 45 דקות',
    client:'שולי רכדינר', date:YESTERDAY, hours:0.75, desc: undefined },
  { in: "צ'יקי היום שעה וחצי פגישה עם לקוח",
    client:"צ'יקי", date:TODAY,     hours:1.5,  desc:'פגישה' },
  { in: 'ממורנד אתמול שלוש שעות ושלושה רבעים עבודת קוד',
    client:'ממורנד', date:YESTERDAY, hours:3.75, desc:'עבודת קוד' },

  // ── heuristic client (not in known list) ─────────────────────────────────
  { in: 'ללקוח גולן אתמול שעתיים ייעוץ',
    client:'גולן',   date:YESTERDAY, hours:2, desc:'ייעוץ' },
  { in: 'אצל דוד היום שעה פגישה',
    client:'דוד',    date:TODAY,     hours:1, desc:'פגישה' },

  // ── standalone number → hours (no hours keyword) ─────────────────────────
  { in: 'ממורנד היום 3 ישיבת צוות',
    client:'ממורנד', date:TODAY, hours:3, desc:'ישיבת צוות' },
  { in: 'ליאב אתמול 2 עבודת קוד',
    client:'ליאב',   date:YESTERDAY, hours:2, desc:'עבודת קוד' },

  // ── standalone number → date day (hours already parsed) ─────────────────
  { in: 'קייזר שלוש שעות 15 הצעת מחיר',
    client:'קייזר',
    date: (() => { const t=new Date(); let d=new Date(t.getFullYear(),t.getMonth(),15); if(d>t) d=new Date(t.getFullYear(),t.getMonth()-1,15); return format(d,'yyyy-MM-dd'); })(),
    hours:3, desc:'הצעת מחיר' },
  { in: 'מנדי שעתיים 10 פגישת לקוח',
    client:'מנדי',
    date: (() => { const t=new Date(); let d=new Date(t.getFullYear(),t.getMonth(),10); if(d>t) d=new Date(t.getFullYear(),t.getMonth()-1,10); return format(d,'yyyy-MM-dd'); })(),
    hours:2, desc:'פגישת לקוח' },
];

let pass = 0, fail = 0;

for (const tc of tests) {
  const r = parse(tc.in, CLIENTS);

  const clientOK = r.client === tc.client;
  const dateOK   = tc.date === 'dow'
    ? (r.work_date !== undefined)           // just verify something was parsed
    : r.work_date === tc.date;
  const hoursOK  = r.hours === tc.hours;
  const descOK   = tc.desc === undefined
    ? (r.description === undefined || r.description === '')
    : r.description?.includes(tc.desc);

  if (clientOK && dateOK && hoursOK && descOK) {
    console.log(`✓  ${tc.in}`);
    pass++;
  } else {
    console.log(`✗  ${tc.in}`);
    if (!clientOK) console.log(`     client  → got "${r.client}", want "${tc.client}"`);
    if (!dateOK)   console.log(`     date    → got "${r.work_date}", want "${tc.date}"`);
    if (!hoursOK)  console.log(`     hours   → got ${r.hours}, want ${tc.hours}`);
    if (!descOK)   console.log(`     desc    → got "${r.description}", want "${tc.desc}"`);
    fail++;
  }
}

console.log(`\n${pass}/${pass + fail} passed`);
