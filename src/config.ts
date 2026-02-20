/**
 * Central application configuration.
 * All runtime values come from environment variables defined in .env
 */
export const config = {
  /** Google Spreadsheet ID (from the sheet URL) */
  sheetId: import.meta.env.VITE_SHEET_ID as string,
  /** Google API key — used for read-only Sheets access */
  apiKey: import.meta.env.VITE_API_KEY as string,
  /** Google OAuth 2.0 client ID — used for write access via GIS */
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID as string,

  /** Sheet tab names (change if you rename tabs in Google Sheets) */
  sheets: {
    entries: 'Sheet1',
    summary: 'Sheet2',
    clients: 'Sheet3',
    users: 'Sheet4',
  },

  /** Voice recognition settings */
  voice: {
    lang: 'he-IL',
  },

  /** localStorage keys */
  storageKeys: {
    username: 'tt_username',
    reminder: 'tt_reminder',
    lastEntry: 'tt_last_entry',
    accessToken: 'tt_access_token',
  },

  /** OAuth scope required for reading and writing Sheets */
  oauthScope: 'https://www.googleapis.com/auth/spreadsheets',
} as const;
