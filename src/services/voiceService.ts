/**
 * Voice input service using the Web Speech API.
 * Parses Hebrew spoken input and extracts structured time-entry fields.
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
};

// ─── Parsing Helpers ──────────────────────────────────────────────────────────

/**
 * Attempt to extract a decimal hours value from a Hebrew text string.
 * Handles patterns like "3 שעות", "שעתיים", "שלוש שעות וחצי", etc.
 * @param text - Raw Hebrew transcription text
 */
function parseHours(text: string): number | undefined {
  // Special case: שעתיים = 2 hours
  if (/שעתיים/.test(text)) {
    const fraction = parseFraction(text);
    return 2 + fraction;
  }

  // Special case: שעה (אחת) = 1 hour
  if (/שעה\s*(אחת|אחד)?/.test(text) && !/שעות/.test(text)) {
    const fraction = parseFraction(text);
    return 1 + fraction;
  }

  // Numeric digit(s) followed by שעות/שעה
  const digitMatch = text.match(/(\d+(?:\.\d+)?)\s*שעות?/);
  if (digitMatch) {
    const base = parseFloat(digitMatch[1]);
    return base + parseFraction(text);
  }

  // Hebrew word followed by שעות
  for (const [word, value] of Object.entries(HEBREW_NUMBERS)) {
    const regex = new RegExp(`${word}\\s+שעות?`);
    if (regex.test(text)) {
      return value + parseFraction(text);
    }
  }

  return undefined;
}

/**
 * Detect and return a fractional hour value from Hebrew fraction words.
 * @param text - Raw Hebrew text
 */
function parseFraction(text: string): number {
  if (/ושלושה\s+רבעים/.test(text)) return 0.75;
  if (/וחצי/.test(text)) return 0.5;
  if (/ורבע/.test(text)) return 0.25;
  return 0;
}

/**
 * Attempt to extract a date from Hebrew date keywords.
 * @param text - Raw Hebrew text
 * @returns Date string in YYYY-MM-DD format, or undefined
 */
function parseDate(text: string): string | undefined {
  const today = new Date();
  if (/היום/.test(text)) return format(today, 'yyyy-MM-dd');
  if (/אתמול/.test(text)) return format(subDays(today, 1), 'yyyy-MM-dd');
  if (/שלשום/.test(text)) return format(subDays(today, 2), 'yyyy-MM-dd');
  return undefined;
}

/**
 * Attempt to extract a client name from a Hebrew phrase.
 * Looks for patterns like "ללקוח X", "עבור X", "עבור לקוח X".
 * @param text - Raw Hebrew text
 * @param knownClients - List of known clients to match against
 */
function parseClient(text: string, knownClients: string[]): string | undefined {
  // Try to match a known client name directly (case-insensitive)
  for (const client of knownClients) {
    if (text.includes(client)) return client;
  }

  // Try heuristic extraction: text after "ללקוח" / "עבור לקוח" / "עבור"
  const patterns = [
    /ללקוח\s+([^\s,]+(?:\s[^\s,]+)?)/,
    /עבור\s+לקוח\s+([^\s,]+(?:\s[^\s,]+)?)/,
    /עבור\s+([^\s,]+(?:\s[^\s,]+)?)/,
    /לקוח\s+([^\s,]+(?:\s[^\s,]+)?)/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }

  return undefined;
}

/**
 * Extract a description from the transcribed text by removing detected
 * hour, client and date sub-strings.
 * @param text - Raw Hebrew transcription
 */
function parseDescription(text: string): string {
  let desc = text;

  // Remove hour-related phrases
  desc = desc.replace(/(\d+(?:\.\d+)?|\w+)\s*שעות?\s*(וחצי|ורבע|ושלושה\s+רבעים)?/g, '');
  desc = desc.replace(/שעתיים\s*(וחצי|ורבע)?/g, '');

  // Remove client-related phrases
  desc = desc.replace(/(?:ללקוח|עבור\s+לקוח|עבור|לקוח)\s+[^\s,]+(?:\s[^\s,]+)?/g, '');

  // Remove date keywords
  desc = desc.replace(/היום|אתמול|שלשום/g, '');

  // Remove common filler words
  desc = desc.replace(/על\s+|עבודה\s+על\s+|עבודה\s+/g, '');

  return desc.replace(/\s+/g, ' ').trim();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse a Hebrew speech transcription and extract time-entry fields.
 *
 * @param transcript - Raw text from Web Speech API
 * @param knownClients - List of known client names for matching
 * @returns Partially or fully populated VoiceParseResult
 */
export function parseVoiceTranscript(
  transcript: string,
  knownClients: string[] = [],
): VoiceParseResult {
  const text = transcript.trim();

  return {
    hours: parseHours(text),
    client: parseClient(text, knownClients),
    work_date: parseDate(text),
    description: parseDescription(text) || undefined,
  };
}

// ─── Speech Recognition Factory ──────────────────────────────────────────────

/**
 * Create and return a configured SpeechRecognition instance for Hebrew.
 * @returns A SpeechRecognition object, or null if the API is not available.
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
