import { google, sheets_v4 } from 'googleapis'

let _sheets: sheets_v4.Sheets | null = null

export function getSheetsClient(): sheets_v4.Sheets {
  if (_sheets) return _sheets
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  _sheets = google.sheets({ version: 'v4', auth })
  return _sheets
}

export const SHEET_ID = process.env.SHEET_ID!
export const EXPENSES_TAB = 'Expenses'
export const SETTINGS_TAB = 'Settings'

const _tabSheetIdCache = new Map<string, number>()

export async function getTabSheetId(tabTitle: string): Promise<number> {
  const cached = _tabSheetIdCache.get(tabTitle)
  if (cached !== undefined) return cached
  const sheets = getSheetsClient()
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
  const tab = meta.data.sheets?.find(s => s.properties?.title === tabTitle)
  const id = tab?.properties?.sheetId ?? 0
  _tabSheetIdCache.set(tabTitle, id)
  return id
}
