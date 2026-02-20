# מעקב שעות — Time Tracker

A Hebrew-language PWA for logging and tracking work hours, backed by Google Sheets.
Built with React 19, TypeScript, Vite, and Tailwind CSS v4.

---

## Features

- Log time entries (client, date, hours, worker, description)
- Hebrew voice input — speak an entry and fields are auto-filled
- History page with search, filters, and Excel (XLSX) export
- Reminder notifications when no entry has been logged recently
- Works offline (PWA / service worker)
- Data stored in Google Sheets — no backend required

---

## Prerequisites

- Node.js 18+ and npm
- A Google account
- A Google Cloud project (free tier is sufficient)

---

## 1. Create the Google Spreadsheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new blank spreadsheet.
2. Rename the four default/added tabs exactly as follows:

   | Tab name | Purpose |
   |----------|---------|
   | `Sheet1` | Time entries (written by the app) |
   | `Sheet2` | Monthly summary (auto-updated by the app) |
   | `Sheet3` | Client list |
   | `Sheet4` | Worker list |

   > To add tabs: click the **+** button at the bottom of the spreadsheet.

3. **Add header rows** (the app will also do this automatically on first use, but doing it manually avoids a brief delay):

   **Sheet1** — row 1:
   ```
   נרשם על ידי | זמן רישום | לקוח | תאריך עבודה | שעות | עובד | מספר עובדים | תיאור
   ```

   **Sheet3** — row 1, cell A1:
   ```
   לקוח
   ```

   **Sheet4** — row 1, cell A1:
   ```
   עובד
   ```

4. **Populate your initial client and worker lists** (optional):
   - In **Sheet3**, add client names in column A starting from row 2 (one per row).
   - In **Sheet4**, add worker names in column A starting from row 2 (one per row).

5. **Share the spreadsheet for public read access** — this allows the API key to read data without requiring every user to log in:
   - Click **Share** (top-right).
   - Under *General access*, change to **Anyone with the link**.
   - Set the role to **Viewer**.
   - Click **Done**.

6. **Copy the Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
   ```
   Save this — you will need it for `VITE_SHEET_ID`.

---

## 2. Enable the Google Sheets API

1. Go to the [Google Cloud Console](https://console.cloud.google.com).
2. Create a new project (or select an existing one).
3. Navigate to **APIs & Services → Library**.
4. Search for **Google Sheets API** and click **Enable**.

---

## 3. Create an API Key (for read access)

The API key lets the app read clients, workers, and entries without requiring a login.

1. In the Cloud Console, go to **APIs & Services → Credentials**.
2. Click **Create Credentials → API key**.
3. Copy the generated key — save it for `VITE_API_KEY`.
4. **Restrict the key** (recommended):
   - Click the pencil icon next to the key.
   - Under *API restrictions*, select **Restrict key** and choose **Google Sheets API**.
   - Under *Application restrictions*, choose **Websites** and add your domain(s):
     - `http://localhost:5173` (development)
     - Your production domain (e.g. `https://your-app.example.com`)
   - Click **Save**.

---

## 4. Create an OAuth 2.0 Client ID (for write access)

The OAuth client lets authenticated users write new entries and add clients/workers.

1. In the Cloud Console, go to **APIs & Services → Credentials**.
2. Click **Create Credentials → OAuth client ID**.
3. If prompted, configure the **OAuth consent screen** first:
   - Choose **External** (or Internal if using Google Workspace).
   - Fill in the required fields (app name, support email).
   - Add the scope `https://www.googleapis.com/auth/spreadsheets`.
   - Add your own Google account as a test user.
   - Save and return to **Credentials**.
4. Back in *Create OAuth client ID*:
   - Application type: **Web application**.
   - Name: anything (e.g. `Time Tracker`).
   - Under *Authorised JavaScript origins*, add:
     - `http://localhost:5173` (development)
     - Your production domain (e.g. `https://your-app.example.com`)
   - Leave *Authorised redirect URIs* empty (not needed for implicit/token flow).
   - Click **Create**.
5. Copy the **Client ID** — save it for `VITE_GOOGLE_CLIENT_ID`.
   It ends in `.apps.googleusercontent.com`.

---

## 5. Configure Environment Variables

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and fill in the three values:
   ```env
   VITE_SHEET_ID=your_spreadsheet_id_here
   VITE_API_KEY=your_api_key_here
   VITE_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
   ```

> **Never commit `.env` to version control.** It is already listed in `.gitignore`.

---

## 6. Install Dependencies

```bash
npm install
```

---

## 7. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

On first launch you will be prompted to enter your display name. After that:

1. Go to **Settings** and tap **התחבר עם Google** to authenticate.
2. Once signed in, you can save entries and add clients/workers.
3. Clients and workers added through the app are written to Sheet3/Sheet4 and available to all users immediately.

---

## 8. Build for Production

```bash
npm run build
```

Output is in the `dist/` directory. The build includes a service worker for offline support and a PWA manifest for installability.

To preview the production build locally:
```bash
npm run preview
```

---

## Spreadsheet Column Reference

### Sheet1 — Time Entries

| Column | Field | Description |
|--------|-------|-------------|
| A | `נרשם על ידי` | Display name of the person who submitted the entry |
| B | `זמן רישום` | ISO-8601 timestamp of when the entry was saved |
| C | `לקוח` | Client name |
| D | `תאריך עבודה` | Work date (YYYY-MM-DD) |
| E | `שעות` | Hours worked (decimal, e.g. `1.5` = 1h 30m) |
| F | `עובד` | Worker name |
| G | `מספר עובדים` | Number of workers involved |
| H | `תיאור` | Free-text description of work done |

### Sheet2 — Monthly Summary (auto-generated)

Overwritten automatically each time an entry is saved.

| Column | Field |
|--------|-------|
| A | Month (YYYY-MM) |
| B | Client |
| C | Total hours |
| D | Number of entries |

### Sheet3 — Clients

| Column | Content |
|--------|---------|
| A | Client name (one per row, row 1 is the header) |

### Sheet4 — Workers

| Column | Content |
|--------|---------|
| A | Worker name (one per row, row 1 is the header) |

---

## Voice Input

Voice input uses the browser's Web Speech API and is optimised for Hebrew (`he-IL`).
Supported in Chrome and Edge; not available in Firefox or Safari.

**Example phrases:**
- `"שלוש שעות ללקוח אקמה על פגישה"` → 3 hours, client "אקמה", description "פגישה"
- `"שעתיים וחצי אתמול עבור לקוח בטא"` → 2.5 hours, yesterday's date, client "בטא"

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Clients/workers list is empty | Sheet is not shared publicly | Set sharing to *Anyone with the link → Viewer* |
| "שגיאה בהתחברות ל-Google" on sign-in | Client ID or authorised origin mismatch | Check `VITE_GOOGLE_CLIENT_ID` and ensure `http://localhost:5173` is in *Authorised JavaScript origins* |
| Entries not saving | Not authenticated, or API key lacks Sheets scope | Sign in via Settings; verify the API key restriction includes Google Sheets API |
| Voice button is greyed out | Browser does not support Web Speech API | Use Chrome or Edge |
| Blank page after build | `VITE_SHEET_ID` or `VITE_API_KEY` is missing | Ensure `.env` exists and all three variables are set |
