/**
 * Voice input service using the Web Speech API.
 * Parses Hebrew spoken input and extracts structured time-entry fields.
 *
 * Expected speech order: client → work date → hours → description
 * Example: "ממורנד אתמול שלוש שעות וחצי ישיבת צוות"
 */

import { format, subDays } from 'date-fns';
import type { VoiceParseResult } from '../types';
import { config } from '../config';

// ─── Hebrew Number Map ────────────────────────────────────────────────────────

/** Map of spoken Hebrew number words to their numeric value */
const HEBREW_NUMBERS: Record<string, number> = {
  אחת: 1, אחד: 1,
  שתיים: 2, שניים: 2, שתי: 2,
  שלוש: 3, שלושה: 3,
  ארבע: 4, ארבעה: 4,
  חמש: 5, חמישה: 5,
  שש: 6, שישה: 6,
  שבע: 7, שבעה: 7,
  שמונה: 8,
  תשע: 9, תשעה: 9,
  עשר: 10, עשרה: 10,
  'אחת עשרה': 11, 'אחד עשר': 11,
  'שתים עשרה': 12, 'שנים עשר': 12,
};

// ─── Hebrew Month Map ─────────────────────────────────────────────────────────

/** Map spoken Hebrew month names to 1-based month numbers */
const HEBREW_MONTHS: Record<string, number> = {
  ינואר: 1,
  פברואר: 2,
  מרץ: 3,
  אפריל: 4,
  מאי: 5,
  יוני: 6,
  יולי: 7,
  אוגוסט: 8,
  ספטמבר: 9,
  אוקטובר: 10,
  נובמבר: 11,
  דצמבר: 12,
};

// ─── Hebrew Day-of-Week Map ───────────────────────────────────────────────────

/** Map spoken Hebrew day names to JS getDay() index (0 = Sunday) */
const HEBREW_DAYS: Record<string, number> = {
  ראשון: 0,
  שני: 1,
  שלישי: 2,
  רביעי: 3,
  חמישי: 4,
  שישי: 5,
  שבת: 6,
};

// ─── Fraction Helper ──────────────────────────────────────────────────────────

/**
 * Detect a fractional-hour suffix (וחצי, ורבע, ושלושה רבעים).
 */
function parseFraction(text: string): number {
  if (/ושלושה\s+רבעים|ו?שלושת\s+רבעי/.test(text)) return 0.75;
  if (/וחצי/.test(text)) return 0.5;
  if (/ורבע/.test(text)) return 0.25;
  return 0;
}

// ─── Field Parsers ────────────────────────────────────────────────────────────

/**
 * Extract decimal hours from Hebrew text.
 *
 * Handles:
 *  - "חצי שעה" → 0.5
 *  - "רבע שעה" → 0.25
 *  - "שלושת רבעי שעה" → 0.75
 *  - "שעה" / "שעה וחצי" → 1 / 1.5
 *  - "שעתיים" / "שעתיים ורבע" → 2 / 2.25
 *  - "3 שעות" / "שלוש שעות וחצי" → 3 / 3.5
 *  - "45 דקות" → 0.75  (rounded to nearest quarter-hour)
 */
function parseHours(text: string): number | undefined {
  // Stand-alone fractional-hour phrases (no leading whole-hour word)
  if (/חצי\s+שעה/.test(text) && !/שעות|שעה\s+וחצי|שעתיים/.test(text)) return 0.5;
  if (/רבע\s+שעה/.test(text) && !/שעות|שעה\s+ורבע|שעתיים/.test(text)) return 0.25;
  if (/שלושת\s+רבעי\s+שעה/.test(text)) return 0.75;

  // שעתיים = 2 hours (+ optional fraction suffix)
  if (/שעתיים/.test(text)) return 2 + parseFraction(text);

  // שעה (singular, without שעות) = 1 hour (+ optional fraction suffix)
  if (/שעה/.test(text) && !/שעות/.test(text)) return 1 + parseFraction(text);

  // Digit(s) + שעות, e.g. "3 שעות וחצי"
  const digitMatch = text.match(/(\d+(?:\.\d+)?)\s*שעות?/);
  if (digitMatch) return parseFloat(digitMatch[1]) + parseFraction(text);

  // Hebrew word + שעות, e.g. "שלוש שעות"
  for (const [word, value] of Object.entries(HEBREW_NUMBERS)) {
    if (new RegExp(`${word}\\s+שעות?`).test(text)) {
      return value + parseFraction(text);
    }
  }

  // X דקות — convert minutes to hours, rounded to nearest quarter
  const minuteMatch = text.match(/(\d+)\s*דקות?/);
  if (minuteMatch) {
    const mins = parseInt(minuteMatch[1], 10);
    return Math.round((mins / 60) * 4) / 4;
  }

  return undefined;
}

/**
 * Parse an explicit day+month date like "16 לפברואר" or "ה-3 במרץ 2024".
 *
 * Accepted patterns:
 *  - "16 לפברואר"        → 16th of February, current or previous year
 *  - "16 בפברואר"        → same, using ב preposition
 *  - "ה-16 לפברואר"      → same, with definite article prefix
 *  - "16 לפברואר 2024"   → 16th of February 2024 (explicit year)
 *
 * If no year is given and the resulting date is in the future, the previous
 * year is used (time-tracking entries are almost always past dates).
 */
function parseDateExplicit(text: string): string | undefined {
  const monthNames = Object.keys(HEBREW_MONTHS).join('|');
  const regex = new RegExp(
    `(?:ה-?)?(\\d{1,2})\\s+[לב](${monthNames})(?:\\s+(\\d{4}))?`,
  );
  const match = text.match(regex);
  if (!match) return undefined;

  const day = parseInt(match[1], 10);
  const month = HEBREW_MONTHS[match[2]];
  if (!month || day < 1 || day > 31) return undefined;

  const currentYear = new Date().getFullYear();
  let year = match[3] ? parseInt(match[3], 10) : currentYear;

  // If the date lands in the future, assume the previous year
  const candidate = new Date(year, month - 1, day);
  if (candidate > new Date()) year -= 1;

  return format(new Date(year, month - 1, day), 'yyyy-MM-dd');
}

/**
 * Extract the work date from Hebrew date keywords or day-of-week names.
 * Returns YYYY-MM-DD, or undefined if no date signal is found.
 *
 * Handles:
 *  - "היום" → today
 *  - "אתמול" → yesterday
 *  - "שלשום" → two days ago
 *  - "16 לפברואר" / "ה-3 במרץ 2024" → explicit day + month (+ optional year)
 *  - "ביום ראשון" / "יום חמישי" → most recent past occurrence of that weekday
 */
function parseDate(text: string): string | undefined {
  const today = new Date();

  if (/היום/.test(text)) return format(today, 'yyyy-MM-dd');
  if (/אתמול/.test(text)) return format(subDays(today, 1), 'yyyy-MM-dd');
  if (/שלשום/.test(text)) return format(subDays(today, 2), 'yyyy-MM-dd');

  // "16 לפברואר" / "ה-3 במרץ 2024"
  const explicit = parseDateExplicit(text);
  if (explicit) return explicit;

  // "ביום ראשון" / "יום שני" — find most recent past occurrence
  for (const [dayName, targetDay] of Object.entries(HEBREW_DAYS)) {
    if (new RegExp(`(?:ביום\\s+|יום\\s+)${dayName}`).test(text)) {
      const todayDay = today.getDay();
      let daysBack = todayDay - targetDay;
      if (daysBack <= 0) daysBack += 7; // same day or future → go back a full week
      return format(subDays(today, daysBack), 'yyyy-MM-dd');
    }
  }

  return undefined;
}

/**
 * Extract a client name from transcribed text.
 *
 * Strategy:
 *  1. Try known clients first — sorted longest→shortest to avoid partial matches.
 *     Matching is case-insensitive.
 *  2. Fall back to heuristic keyword patterns (ללקוח X, עבור X, אצל X, של X).
 */
function parseClient(text: string, knownClients: string[]): string | undefined {
  // Sort by descending length so "אורי רז" beats "אורי"
  const sorted = [...knownClients].sort((a, b) => b.length - a.length);
  for (const client of sorted) {
    const escaped = client.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(escaped, 'i').test(text)) return client;
  }

  // Heuristic patterns — ordered from most to least specific
  const patterns = [
    /ללקוח\s+([^\s,]+(?:\s+[^\s,]+)?)/,
    /עבור\s+לקוח\s+([^\s,]+(?:\s+[^\s,]+)?)/,
    /לקוח\s+([^\s,]+(?:\s+[^\s,]+)?)/,
    /אצל\s+([^\s,]+(?:\s+[^\s,]+)?)/,
    /עבור\s+([^\s,]+(?:\s+[^\s,]+)?)/,
    /של\s+([^\s,]+(?:\s+[^\s,]+)?)/,
  ];
  // Strip trailing date/time stop words that bleed into the client capture group
  const stopWords = /\s+(?:היום|אתמול|שלשום|ביום|יום|ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת|שעתיים|שעה|חצי|רבע|\d+\s*(?:שעות?|דקות?)).*$/;
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].replace(stopWords, '').trim();
  }

  return undefined;
}

/**
 * Build the description by stripping all recognised field tokens from the text,
 * leaving only the free-text work description.
 *
 * @param text   - Raw transcript
 * @param client - Already-detected client name (removed verbatim if present)
 */
function parseDescription(text: string, client: string | undefined): string {
  let desc = text;

  // Remove the matched client name
  if (client) {
    const escaped = client.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    desc = desc.replace(new RegExp(escaped, 'gi'), '');
  }
  // Remove heuristic client introduction phrases
  desc = desc.replace(
    /(?:ללקוח|עבור\s+לקוח|לקוח|עבור|אצל|של)\s+[^\s,]+(?:\s+[^\s,]+)?/g,
    '',
  );

  // Remove stand-alone fractional-hour phrases
  desc = desc.replace(/שלושת\s+רבעי\s+שעה/g, '');
  desc = desc.replace(/חצי\s+שעה/g, '');
  desc = desc.replace(/רבע\s+שעה/g, '');

  // Remove whole + fractional hour expressions
  desc = desc.replace(
    /שעתיים(?:\s+(?:וחצי|ורבע|ושלושה\s+רבעים|ושלושת\s+רבעי))?/g,
    '',
  );
  desc = desc.replace(
    /שעה(?:\s+(?:וחצי|ורבע|ושלושה\s+רבעים|ושלושת\s+רבעי))?/g,
    '',
  );
  desc = desc.replace(
    /\d+(?:\.\d+)?\s*שעות?(?:\s+(?:וחצי|ורבע|ושלושה\s+רבעים))?/g,
    '',
  );
  desc = desc.replace(
    /[א-ת]+\s+שעות?(?:\s+(?:וחצי|ורבע))?/g,
    '',
  );
  desc = desc.replace(/\d+\s*דקות?/g, '');
  // Orphaned fraction words
  desc = desc.replace(/(?:וחצי|ורבע|ושלושה\s+רבעים)/g, '');

  // Remove explicit date expressions: "16 לפברואר", "ה-3 במרץ 2024", etc.
  const monthNames = Object.keys(HEBREW_MONTHS).join('|');
  desc = desc.replace(
    new RegExp(`(?:ה-?)?\\d{1,2}\\s+[לב](?:${monthNames})(?:\\s+\\d{4})?`, 'g'),
    '',
  );

  // Remove date keywords and day-of-week phrases
  desc = desc.replace(
    /(?:ביום\s+|יום\s+)?(?:ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)/g,
    '',
  );
  desc = desc.replace(/היום|אתמול|שלשום/g, '');

  // Strip leading filler prepositions left behind
  desc = desc.replace(/\b(?:על|ב|את|עם|ל)\s+/g, '');

  return desc.replace(/\s{2,}/g, ' ').trim();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse a Hebrew speech transcription and extract time-entry fields.
 * Fields are returned in the entry-form order: client → work_date → hours → description.
 *
 * @param transcript   - Raw text from Web Speech API
 * @param knownClients - Known client names to match against
 */
export function parseVoiceTranscript(
  transcript: string,
  knownClients: string[] = [],
): VoiceParseResult {
  const text = transcript.trim();
  const client = parseClient(text, knownClients);

  return {
    client,
    work_date: parseDate(text),
    hours: parseHours(text),
    description: parseDescription(text, client) || undefined,
  };
}

// ─── Speech Recognition Factory ──────────────────────────────────────────────

/**
 * Create and return a configured SpeechRecognition instance for Hebrew.
 * Returns null if the browser does not support the Web Speech API.
 */
export function createRecognition(): SpeechRecognition | null {
  const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!Ctor) return null;

  const recognition = new Ctor();
  recognition.lang = config.voice.lang;
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  return recognition;
}
