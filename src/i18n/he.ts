/**
 * Single source of truth for all Hebrew UI strings.
 * Import this object wherever text is displayed to the user.
 * All keys are in English; all values are in Hebrew.
 */
export const he = {
  // ─── App ───────────────────────────────────────────────────────────────────
  appName: 'מעקב שעות',
  loading: 'טוען...',
  save: 'שמור',
  cancel: 'ביטול',
  delete: 'מחק',
  edit: 'ערוך',
  add: 'הוסף',
  close: 'סגור',
  confirm: 'אשר',
  yes: 'כן',
  no: 'לא',
  search: 'חיפוש',
  filter: 'סינון',
  clear: 'נקה',
  refresh: 'רענן',
  export: 'ייצא',
  all: 'הכל',
  noData: 'אין נתונים להצגה',
  error: 'שגיאה',

  // ─── Navigation ────────────────────────────────────────────────────────────
  nav: {
    home: 'טופס',
    history: 'היסטוריה',
    settings: 'הגדרות',
  },

  // ─── User Setup ────────────────────────────────────────────────────────────
  userSetup: {
    welcome: 'ברוכים הבאים',
    subtitle: 'כדי להתחיל, הזן את שמך',
    namePlaceholder: 'שם מלא',
    start: 'התחל',
    nameRequired: 'נא להזין שם',
  },

  // ─── Entry Form ────────────────────────────────────────────────────────────
  form: {
    title: 'רישום שעות',
    client: 'לקוח',
    clientPlaceholder: 'בחר לקוח',
    addNewClient: 'הוסף לקוח חדש',
    newClientPlaceholder: 'שם הלקוח החדש',
    workDate: 'תאריך עבודה',
    hours: 'שעות',
    hoursPlaceholder: '0.0',
    worker: 'עובד',
    workerPlaceholder: 'בחר עובד',
    workerCount: 'מספר עובדים',
    description: 'תיאור',
    descriptionPlaceholder: 'תאר את העבודה שבוצעה...',
    submit: 'שמור רשומה',
    clear: 'נקה טופס',
    enteredBy: 'נרשם על ידי',
    voiceInputHint: 'לחץ על המיקרופון לרישום קולי',
  },

  // ─── Validation ────────────────────────────────────────────────────────────
  validation: {
    clientRequired: 'יש לבחור לקוח',
    hoursRequired: 'יש להזין מספר שעות',
    hoursInvalid: 'מספר השעות אינו תקין',
    workerRequired: 'יש לבחור עובד',
    workerCountInvalid: 'מספר עובדים אינו תקין',
    dateRequired: 'יש לבחור תאריך',
    dateTooFarInFuture: 'תאריך העבודה לא יכול להיות יותר מ-2 ימים בעתיד',
    googleAuthRequired: 'נא להתחבר לחשבון Google כדי לשמור נתונים',
    sheetsNotConfigured: 'הגדרות Google Sheets חסרות — ראה README',
  },

  // ─── Toast Messages ─────────────────────────────────────────────────────────
  toast: {
    entrySaved: 'הרשומה נשמרה בהצלחה ✓',
    entrySaveError: 'שגיאה בשמירת הרשומה',
    clientAdded: 'הלקוח נוסף בהצלחה',
    clientAddError: 'שגיאה בהוספת הלקוח',
    workerAdded: 'העובד נוסף בהצלחה',
    workerAddError: 'שגיאה בהוספת העובד',
    exportSuccess: 'הקובץ יוצא בהצלחה',
    exportError: 'שגיאה בייצוא הקובץ',
    loadError: 'שגיאה בטעינת הנתונים',
    networkError: 'שגיאת רשת — בדוק את החיבור לאינטרנט',
    settingsSaved: 'ההגדרות נשמרו',
    copiedToClipboard: 'הועתק ללוח',
    notificationEnabled: 'התראות הופעלו',
    notificationDenied: 'ההרשאה לתראות נדחתה',
    clientDeleted: 'הלקוח נמחק',
  },

  // ─── History Page ───────────────────────────────────────────────────────────
  history: {
    title: 'היסטוריה',
    searchPlaceholder: 'חיפוש לפי לקוח, עובד או תיאור...',
    fromDate: 'מתאריך',
    toDate: 'עד תאריך',
    allClients: 'כל הלקוחות',
    allWorkers: 'כל העובדים',
    exportBtn: 'ייצוא ל-Excel',
    totalHours: 'סה״כ שעות',
    entriesCount: 'רשומות',
    columns: {
      date: 'תאריך',
      client: 'לקוח',
      worker: 'עובד',
      hours: 'שעות',
      description: 'תיאור',
      enteredBy: 'נרשם ע״י',
    },
  },

  // ─── Settings Page ──────────────────────────────────────────────────────────
  settings: {
    title: 'הגדרות',
    username: 'שם משתמש',
    changeUsername: 'שנה שם',
    usernamePlaceholder: 'הכנס שם חדש',
    clientsSection: 'ניהול לקוחות',
    addClientPlaceholder: 'שם לקוח חדש',
    workersSection: 'ניהול עובדים',
    addWorkerPlaceholder: 'שם עובד חדש',
    reminderSection: 'הגדרות תזכורת',
    reminderEnabled: 'הפעל תזכורות',
    remindAfter: 'שלח תזכורת לאחר',
    reminderUnit: {
      hours: 'שעות',
      days: 'ימים',
    },
    googleSection: 'חיבור ל-Google',
    signInWithGoogle: 'התחבר עם Google',
    connectedAs: 'מחובר כ:',
    disconnect: 'התנתק',
    notConnected: 'לא מחובר',
    enableNotifications: 'הפעל התראות דפדפן',
    switchUser: 'החלף משתמש',
  },

  // ─── Export Modal ────────────────────────────────────────────────────────────
  exportModal: {
    title: 'ייצוא נתונים',
    fromDate: 'מתאריך',
    toDate: 'עד תאריך',
    client: 'לקוח',
    worker: 'עובד',
    allClients: 'כל הלקוחות',
    allWorkers: 'כל העובדים',
    exportBtn: 'ייצוא',
    sheetRaw: 'נתונים גולמיים',
    sheetSummary: 'סיכום',
    columnHeaders: {
      enteredBy: 'נרשם על ידי',
      entryTimestamp: 'זמן רישום',
      client: 'לקוח',
      workDate: 'תאריך עבודה',
      hours: 'שעות',
      worker: 'עובד',
      workerCount: 'מספר עובדים',
      description: 'תיאור',
    },
    summaryHeaders: {
      month: 'חודש',
      client: 'לקוח',
      totalHours: 'סה״כ שעות',
      entryCount: 'מספר רשומות',
    },
  },

  // ─── Reminder ────────────────────────────────────────────────────────────────
  reminder: {
    bannerPrefix: 'לא רשמת שעות מאז',
    bannerSuffix: '— זמן לרשום!',
    dismiss: 'סגור',
    logNow: 'רשום עכשיו',
    notificationTitle: 'תזכורת: מעקב שעות',
    notificationBody: 'לא נרשמו שעות עבודה לאחרונה. לחץ כדי לרשום.',
  },

  // ─── Voice Input ─────────────────────────────────────────────────────────────
  voice: {
    listenBtn: 'לחץ לדיבור',
    listening: 'מאזין...',
    notSupported: 'קלט קולי אינו נתמך בדפדפן זה',
    parseError: 'לא הצלחתי לפרש את הדיבור — נסה שוב',
    filled: 'השדות מולאו מהדיבור',
  },

  // ─── Months (for summary display) ───────────────────────────────────────────
  months: [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
  ],
} as const;

export type HE = typeof he;
