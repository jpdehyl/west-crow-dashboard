import { google } from "googleapis"

export interface PricedLineItem {
  description: string
  man_days: number | null
  total: number
}

const SECTION_NAMES = [
  "Flooring",
  "Demo Structural",
  "Washroom",
  "Others/Misc",
  "Hazmat ACM",
  "Mob/Clean/Demob",
] as const

function pickSection(description: string): string {
  const d = description.toLowerCase()
  if (d.includes("floor")) return "Flooring"
  if (d.includes("wash")) return "Washroom"
  if (d.includes("hazmat") || d.includes("asbestos") || d.includes("acm")) return "Hazmat ACM"
  if (d.includes("mob") || d.includes("demob") || d.includes("clean")) return "Mob/Clean/Demob"
  if (d.includes("struct") || d.includes("ceiling") || d.includes("partition") || d.includes("demo")) return "Demo Structural"
  return "Others/Misc"
}

function extractUnits(description: string): number {
  const m = description.match(/\(([\d,.]+)\s*(SF|LF|EA|CY|DAY)\)/i)
  if (!m) return 0
  return Number(m[1].replaceAll(",", "")) || 0
}

function yymmdd(date = new Date()) {
  return date.toISOString().slice(2, 10).replaceAll("-", "")
}

export async function createEstimateSheet(projectName: string, lineItems: PricedLineItem[]): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  if (!clientId || !clientSecret || !refreshToken) return null

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret)
  oauth2.setCredentials({ refresh_token: refreshToken })

  const sheets = google.sheets({ version: "v4", auth: oauth2 })
  const drive = google.drive({ version: "v3", auth: oauth2 })

  const title = `${projectName} - Demo Estimate ${yymmdd()}`
  const created = await sheets.spreadsheets.create({
    requestBody: { properties: { title } },
  })
  const spreadsheetId = created.data.spreadsheetId
  if (!spreadsheetId) return null

  const grouped = new Map<string, PricedLineItem[]>()
  for (const section of SECTION_NAMES) grouped.set(section, [])
  for (const item of lineItems.filter(i => !/labour scope total|total recommended bid|subtrades/i.test(i.description))) {
    grouped.get(pickSection(item.description))?.push(item)
  }

  const rows: (string | number)[][] = []
  rows.push(["DeHyl", "", projectName, "", "", "", "", "", "", "", "", "", ""])
  rows.push(["Project", "", title, "", "", "", "", "", "", "", "", "", ""])
  rows.push(["Section", "Work Class", "Activity", "Total Units", "Units/Day", "Man-Days", "Labour", "Material 18%", "Subtotal", "OH 12%", "Profit 30%", "Total", "Notes"])
  rows.push(["Rates", "", "", "", "", "", 296, "", "", "", "", "", "Blended crew day rate"])

  for (const section of SECTION_NAMES) {
    rows.push([section, "", "", "", "", "", "", "", "", "", "", "", ""])
    const items = grouped.get(section) ?? []
    for (const item of items) {
      const units = extractUnits(item.description)
      const unitsPerDay = units > 0 && item.man_days && item.man_days > 0 ? units / item.man_days : 0
      rows.push(["", section, item.description, units, unitsPerDay, "", "", "", "", "", "", "", ""])
    }
  }

  rows.push(["Crew", "Supervisor", "1 @ $45/hr", "", "", "", "", "", "", "", "", "", ""])
  rows.push(["Crew", "Workers", "3 @ $35/hr", "", "", "", "", "", "", "", "", "", ""])

  const manDayRefRow = rows.length + 1
  rows.push(["Subtrades", "Bins", "40YD bins", 1, 2800, "", "", "", "", "", "", "", ""])
  rows.push(["Subtrades", "PM", "1hr every other day @ $95", 0.5, 95, "", "", "", "", "", "", "", ""])
  rows.push(["Subtrades", "Pickup", "ManDays × $90", "", 90, "", "", "", "", "", "", "", ""])
  rows.push(["Subtrades", "Small tools", "ManDays × 8 × $1.81", "", 14.48, "", "", "", "", "", "", "", ""])

  const dehylTotalRow = rows.length + 1
  rows.push(["", "", "DeHyl Forces Total", "", "", "", "", "", "", "", "", "", ""])
  const subtradesTotalRow = rows.length + 1
  rows.push(["", "", "Subtrades Total", "", "", "", "", "", "", "", "", "", ""])
  const grandRow = rows.length + 1
  rows.push(["", "", "Grand Total (DeHyl + Subtrades + 20%)", "", "", "", "", "", "", "", "", "", ""])

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "A1:M300",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rows },
  })

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        ...Array.from({ length: rows.length - 4 }, (_, idx) => {
          const r = idx + 5
          return {
            updateCells: {
              rows: [{ values: [
                { userEnteredValue: { formulaValue: `=IF(AND(D${r}>0,E${r}>0),D${r}/E${r},0)` } },
                { userEnteredValue: { formulaValue: `=F${r}*$G$4` } },
                { userEnteredValue: { formulaValue: `=G${r}*0.18` } },
                { userEnteredValue: { formulaValue: `=G${r}+H${r}` } },
                { userEnteredValue: { formulaValue: `=I${r}*0.12` } },
                { userEnteredValue: { formulaValue: `=I${r}*0.30` } },
                { userEnteredValue: { formulaValue: `=I${r}+J${r}+K${r}` } },
              ] }],
              fields: "userEnteredValue",
              start: { sheetId: 0, rowIndex: r - 1, columnIndex: 5 },
            },
          }
        }),
        {
          updateCells: {
            rows: [{ values: [{ userEnteredValue: { formulaValue: `=SUM(L5:L${dehylTotalRow - 1})` } }] }],
            fields: "userEnteredValue",
            start: { sheetId: 0, rowIndex: dehylTotalRow - 1, columnIndex: 11 },
          },
        },
        {
          updateCells: {
            rows: [{ values: [{ userEnteredValue: { formulaValue: `=SUM(L${manDayRefRow}:L${subtradesTotalRow - 1})` } }] }],
            fields: "userEnteredValue",
            start: { sheetId: 0, rowIndex: subtradesTotalRow - 1, columnIndex: 11 },
          },
        },
        {
          updateCells: {
            rows: [{ values: [{ userEnteredValue: { formulaValue: `=(L${dehylTotalRow}+L${subtradesTotalRow})*1.2` } }] }],
            fields: "userEnteredValue",
            start: { sheetId: 0, rowIndex: grandRow - 1, columnIndex: 11 },
          },
        },
      ],
    },
  })

  const rootName = "West Crow Bids"
  const queryByName = async (name: string, parent?: string) => {
    const q = [`name='${name.replaceAll("'", "\\'")}'`, "mimeType='application/vnd.google-apps.folder'", "trashed=false"]
    if (parent) q.push(`'${parent}' in parents`)
    return drive.files.list({ q: q.join(" and "), fields: "files(id,name)", pageSize: 1 })
  }

  let rootFolderId = (await queryByName(rootName)).data.files?.[0]?.id
  if (!rootFolderId) {
    rootFolderId = (await drive.files.create({ requestBody: { name: rootName, mimeType: "application/vnd.google-apps.folder" }, fields: "id" })).data.id ?? undefined
  }

  let projectFolderId: string | undefined
  if (rootFolderId) {
    projectFolderId = (await queryByName(projectName, rootFolderId)).data.files?.[0]?.id
    if (!projectFolderId) {
      projectFolderId = (await drive.files.create({
        requestBody: { name: projectName, mimeType: "application/vnd.google-apps.folder", parents: [rootFolderId] },
        fields: "id",
      })).data.id ?? undefined
    }
  }

  if (projectFolderId) {
    const file = await drive.files.get({ fileId: spreadsheetId, fields: "parents" })
    const prevParents = (file.data.parents ?? []).join(",")
    await drive.files.update({ fileId: spreadsheetId, addParents: projectFolderId, removeParents: prevParents, fields: "id" })
  }

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
}
