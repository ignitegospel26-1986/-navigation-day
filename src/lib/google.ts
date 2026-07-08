import { google } from "googleapis";
import type { ModuleKey } from "./prompts";
import {
  APP_MARKER_KEY,
  FOLDER_NAME,
  SHEET_TABS,
  SPREADSHEET_NAME,
  folderProperties,
  moduleHeaders,
  spreadsheetProperties,
} from "./schema";

const SPREADSHEET_MIME = "application/vnd.google-apps.spreadsheet";
const FOLDER_MIME = "application/vnd.google-apps.folder";

function oauth(accessToken: string) {
  const client = new google.auth.OAuth2();
  client.setCredentials({ access_token: accessToken });
  return client;
}

const driveApi = (t: string) => google.drive({ version: "v3", auth: oauth(t) });
const sheetsApi = (t: string) => google.sheets({ version: "v4", auth: oauth(t) });
const calendarApi = (t: string) =>
  google.calendar({ version: "v3", auth: oauth(t) });

export interface Space {
  spreadsheetId: string;
  folderId: string | null;
  webViewLink: string;
  /** true when the only space we could find is sitting in the Drive trash */
  trashed: boolean;
}

/**
 * Look for the reset spreadsheet this app created. We deliberately do NOT add
 * `trashed=false`: we want to see a trashed space too, so a returning user who
 * binned (but didn't purge) their data is offered restore/rebuild instead of
 * silently getting a duplicate. An active copy always wins over a trashed one.
 */
export async function findSpace(accessToken: string): Promise<Space | null> {
  const res = await driveApi(accessToken).files.list({
    q: `mimeType='${SPREADSHEET_MIME}' and appProperties has { key='${APP_MARKER_KEY}' and value='spreadsheet' }`,
    fields: "files(id,name,webViewLink,parents,trashed)",
    spaces: "drive",
    pageSize: 10,
    orderBy: "createdTime",
  });
  const files = res.data.files ?? [];
  if (!files.length) return null;

  const chosen = files.find((f) => !f.trashed) ?? files[0];
  if (!chosen.id) return null;
  return {
    spreadsheetId: chosen.id,
    folderId: chosen.parents?.[0] ?? null,
    webViewLink:
      chosen.webViewLink ??
      `https://docs.google.com/spreadsheets/d/${chosen.id}/edit`,
    trashed: !!chosen.trashed,
  };
}

/** Recreate any of the three tabs that were manually deleted, keeping the rest
 *  (and their history) intact. Returns which tabs were repaired. */
export async function ensureTabs(
  accessToken: string,
  spreadsheetId: string
): Promise<{ repaired: ModuleKey[] }> {
  const sheets = sheetsApi(accessToken);
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });
  const existing = new Set(
    (meta.data.sheets ?? []).map((s) => s.properties?.title)
  );
  const modules: ModuleKey[] = ["daily", "weekly", "quarterly"];
  const missing = modules.filter((m) => !existing.has(SHEET_TABS[m].title));
  if (!missing.length) return { repaired: [] };

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: missing.map((m) => ({
        addSheet: {
          properties: {
            title: SHEET_TABS[m].title,
            gridProperties: { frozenRowCount: 1 },
          },
        },
      })),
    },
  });
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: missing.map((m) => ({
        range: `${SHEET_TABS[m].title}!A1`,
        values: [moduleHeaders(m)],
      })),
    },
  });
  return { repaired: missing };
}

/** Un-trash a previously binned space (spreadsheet + its folder). */
export async function restoreSpace(
  accessToken: string,
  spreadsheetId: string,
  folderId: string | null
): Promise<void> {
  const drive = driveApi(accessToken);
  await drive.files.update({
    fileId: spreadsheetId,
    requestBody: { trashed: false },
  });
  if (folderId)
    await drive.files.update({
      fileId: folderId,
      requestBody: { trashed: false },
    });
}

/** Create the folder + spreadsheet (3 tabs, header rows) inside the user's Drive. */
export async function createSpace(accessToken: string): Promise<Space> {
  const drive = driveApi(accessToken);

  // 1. Folder
  const folder = await drive.files.create({
    requestBody: {
      name: FOLDER_NAME,
      mimeType: FOLDER_MIME,
      appProperties: folderProperties(),
    },
    fields: "id",
  });
  const folderId = folder.data.id!;

  // 2. Empty spreadsheet inside the folder, tagged with our marker.
  const created = await drive.files.create({
    requestBody: {
      name: SPREADSHEET_NAME,
      mimeType: SPREADSHEET_MIME,
      parents: [folderId],
      appProperties: spreadsheetProperties(),
    },
    fields: "id,webViewLink",
  });
  const spreadsheetId = created.data.id!;

  // 3. Rename the default sheet, add the other two, then write headers.
  const sheets = sheetsApi(accessToken);
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.sheetId,sheets.properties.title",
  });
  const firstSheetId = meta.data.sheets?.[0]?.properties?.sheetId ?? 0;

  const modules: ModuleKey[] = ["daily", "weekly", "quarterly"];
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: {
              sheetId: firstSheetId,
              title: SHEET_TABS.daily.title,
              gridProperties: { frozenRowCount: 1 },
            },
            fields: "title,gridProperties.frozenRowCount",
          },
        },
        {
          addSheet: {
            properties: {
              title: SHEET_TABS.weekly.title,
              gridProperties: { frozenRowCount: 1 },
            },
          },
        },
        {
          addSheet: {
            properties: {
              title: SHEET_TABS.quarterly.title,
              gridProperties: { frozenRowCount: 1 },
            },
          },
        },
      ],
    },
  });

  // 4. Header rows for each tab.
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: modules.map((m) => ({
        range: `${SHEET_TABS[m].title}!A1`,
        values: [moduleHeaders(m)],
      })),
    },
  });

  return {
    spreadsheetId,
    folderId,
    webViewLink:
      created.data.webViewLink ??
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    trashed: false,
  };
}

/** Append one record to a module's tab. */
export async function appendRow(
  accessToken: string,
  spreadsheetId: string,
  module: ModuleKey,
  values: (string | number)[]
): Promise<void> {
  await sheetsApi(accessToken).spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_TABS[module].title}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [values] },
  });
}

/**
 * Find the (latest) row for a given period in a module's tab. Row number is the
 * 1-based sheet row (header is row 1, so data starts at 2). Returns null if the
 * period has no record yet.
 */
export async function findRecordRow(
  accessToken: string,
  spreadsheetId: string,
  module: ModuleKey,
  period: string
): Promise<{ rowNumber: number; values: string[] } | null> {
  const rows = await readModule(accessToken, spreadsheetId, module);
  const target = period.trim();
  let found = -1;
  for (let i = 0; i < rows.length; i++) {
    if ((rows[i][1] ?? "").trim() === target) found = i; // period is column B
  }
  if (found < 0) return null;
  return { rowNumber: found + 2, values: rows[found] };
}

/** Overwrite an existing row in place (used when editing that period's record). */
export async function updateRow(
  accessToken: string,
  spreadsheetId: string,
  module: ModuleKey,
  rowNumber: number,
  values: (string | number)[]
): Promise<void> {
  await sheetsApi(accessToken).spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_TABS[module].title}!A${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  });
}

/** Read all data rows (excluding header) from a module's tab. */
export async function readModule(
  accessToken: string,
  spreadsheetId: string,
  module: ModuleKey
): Promise<string[][]> {
  const res = await sheetsApi(accessToken).spreadsheets.values.get({
    spreadsheetId,
    range: SHEET_TABS[module].title,
  });
  const rows = res.data.values ?? [];
  return rows.slice(1) as string[][]; // drop header
}

/* ------------------------------- reminders -------------------------------- */
export interface ReminderOptions {
  startDate: string; // YYYY-MM-DD in the user's timezone
  dailyTime: string; // "HH:MM"
  weeklyDay: number; // 0=Sun .. 6=Sat
  weeklyTime: string;
  quarterlyTime: string;
  timeZone: string;
}

const RRULE_DAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

const addMinutes = (hhmm: string, mins: number): string => {
  const [h, m] = hhmm.split(":").map(Number);
  const total = (h * 60 + m + mins) % (24 * 60);
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
};

const nextDay = (date: string): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

/**
 * Create (or replace) the three recurring reminders in the user's OWN primary
 * calendar. Idempotent: existing lifeReset events are removed first, tagged via
 * a private extended property, so re-syncing never piles up duplicates.
 */
export async function syncReminders(
  accessToken: string,
  opts: ReminderOptions
): Promise<{ created: string[] }> {
  const cal = calendarApi(accessToken);
  const { startDate, timeZone } = opts;

  const specs = [
    {
      type: "daily",
      body: {
        summary: "導航日・每日打卡",
        description: "花兩分鐘，把今天的自己寫回來。",
        start: { dateTime: `${startDate}T${opts.dailyTime}:00`, timeZone },
        end: {
          dateTime: `${startDate}T${addMinutes(opts.dailyTime, 15)}:00`,
          timeZone,
        },
        recurrence: ["RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"],
        reminders: {
          useDefault: false,
          overrides: [{ method: "popup", minutes: 0 }],
        },
        extendedProperties: { private: { lifeReset: "daily" } },
      },
    },
    {
      type: "weekly",
      body: {
        summary: "導航日・每週整理",
        description: "週日的深呼吸，命名這一週真正主導你的內在模式。",
        start: { dateTime: `${startDate}T${opts.weeklyTime}:00`, timeZone },
        end: {
          dateTime: `${startDate}T${addMinutes(opts.weeklyTime, 20)}:00`,
          timeZone,
        },
        recurrence: [
          `RRULE:FREQ=WEEKLY;BYDAY=${RRULE_DAY[opts.weeklyDay] ?? "SU"}`,
        ],
        reminders: {
          useDefault: false,
          overrides: [{ method: "popup", minutes: 0 }],
        },
        extendedProperties: { private: { lifeReset: "weekly" } },
      },
    },
    {
      type: "quarterly",
      body: {
        summary: "導航日・季度深度重啟（給自己留一整天）",
        description: "一步一題的深度重啟，最後留下一張身分宣告卡。",
        start: { date: startDate },
        end: { date: nextDay(startDate) },
        recurrence: ["RRULE:FREQ=MONTHLY;INTERVAL=3"],
        reminders: {
          useDefault: false,
          overrides: [{ method: "popup", minutes: 9 * 60 }],
        },
        extendedProperties: { private: { lifeReset: "quarterly" } },
      },
    },
  ];

  const created: string[] = [];
  for (const spec of specs) {
    await deleteRemindersByType(cal, spec.type); // replace any previous series
    await cal.events.insert({ calendarId: "primary", requestBody: spec.body });
    created.push(spec.type);
  }

  return { created };
}

const REMINDER_TYPES = ["daily", "weekly", "quarterly"] as const;
type CalendarClient = ReturnType<typeof calendarApi>;
const LOOKAHEAD_MS = 400 * 24 * 60 * 60 * 1000;

/**
 * The recurring-series master ids for one reminder type. We look at upcoming
 * *instances* (singleEvents=true + timeMin), which reliably match a recurring
 * series' private extended property, and map each back to its master id.
 */
async function masterIdsForType(
  cal: CalendarClient,
  type: string
): Promise<Set<string>> {
  const now = new Date();
  const res = await cal.events.list({
    calendarId: "primary",
    privateExtendedProperty: [`lifeReset=${type}`],
    singleEvents: true,
    timeMin: now.toISOString(),
    timeMax: new Date(now.getTime() + LOOKAHEAD_MS).toISOString(),
    maxResults: 50,
    orderBy: "startTime",
  });
  const ids = new Set<string>();
  for (const ev of res.data.items ?? []) {
    const id = ev.recurringEventId ?? ev.id;
    if (id) ids.add(id);
  }
  return ids;
}

/** Delete every lifeReset series of one type from the user's primary calendar. */
async function deleteRemindersByType(
  cal: CalendarClient,
  type: string
): Promise<number> {
  const ids = await masterIdsForType(cal, type);
  let removed = 0;
  for (const id of ids) {
    try {
      await cal.events.delete({ calendarId: "primary", eventId: id });
      removed++;
    } catch {
      /* already gone */
    }
  }
  return removed;
}

/** Remove all reminders this app created from the user's own calendar. */
export async function removeReminders(
  accessToken: string
): Promise<{ removed: number }> {
  const cal = calendarApi(accessToken);
  let removed = 0;
  for (const type of REMINDER_TYPES) {
    removed += await deleteRemindersByType(cal, type);
  }
  return { removed };
}

/** Whether this app currently has any reminder series in the user's calendar. */
export async function countReminders(
  accessToken: string
): Promise<{ synced: boolean }> {
  const cal = calendarApi(accessToken);
  for (const type of REMINDER_TYPES) {
    if ((await masterIdsForType(cal, type)).size > 0) return { synced: true };
  }
  return { synced: false };
}

export { calendarApi };
