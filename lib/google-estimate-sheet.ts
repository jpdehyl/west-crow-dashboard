import { google } from "googleapis"

export type ClarkPricedLineItem = { description: string; man_days: number | null; total: number }

function toSheetTitle(projectName: string) {
  const now = new Date()
  const yy = String(now.getUTCFullYear()).slice(2)
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(now.getUTCDate()).padStart(2, "0")
  return `${projectName} - Demo Estimate ${yy}${mm}${dd}`
}

function sanitizeName(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, "-").trim().slice(0, 90)
}

function classifySection(description: string): string {
  const d = description.toLowerCase()
  if (d.includes("floor")) return "Flooring"
  if (d.includes("washroom") || d.includes("toilet") || d.includes("vanity")) return "Washroom"
  if (d.includes("hazmat") || d.includes("acm") || d.includes("asbestos")) return "Hazmat ACM"
  if (d.includes("mob") || d.includes("demob") || d.includes("clean")) return "Mob/Clean/Demob"
  if (d.includes("struct") || d.includes("ceiling") || d.includes("partition") || d.includes("demo")) return "Demo Structural"
  return "Others/Misc"
}

function defaultUnitsPerDay(section: string) {
  if (section === "Flooring") return 280
  if (section === "Washroom") return 120
  if (section === "Hazmat ACM") return 180
  if (section === "Mob/Clean/Demob") return 1
  if (section === "Demo Structural") return 220
  return 140
}

export async function createClarkEstimateSheet(projectName: string, lineItems: ClarkPricedLineItem[]) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN
  if (!clientId || !clientSecret || !refreshToken) return null

  const auth = new google.auth.OAuth2(clientId, clientSecret)
  auth.setCredentials({ refresh_token: refreshToken })

  const sheets = google.sheets({ version: "v4", auth })
  const drive = google.drive({ version: "v3", auth })

  const title = toSheetTitle(projectName)
  const create = await sheets.spreadsheets.create({ requestBody: { properties: { title } } })
  const spreadsheetId = create.data.spreadsheetId
  if (!spreadsheetId) return null

  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`

  const rootFolderName = "West Crow Bids"
  const projectFolderName = sanitizeName(projectName)

  async function ensureFolder(name: string, parentId?: string): Promise<string> {
    const qParts = [
      `name='${name.replace(/'/g, "\\'")}'`,
      "mimeType='application/vnd.google-apps.folder'",
      "trashed=false",
      parentId ? `'${parentId}' in parents` : "'root' in parents",
    ]
    const existing = await drive.files.list({ q: qParts.join(" and "), fields: "files(id,name)", pageSize: 1 })
    if (existing.data.files?.[0]?.id) return existing.data.files[0].id

    const created = await drive.files.create({
      requestBody: {
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: parentId ? [parentId] : undefined,
      },
      fields: "id",
    })
    return created.data.id!
  }

  const rootFolderId = await ensureFolder(rootFolderName)
  const projectFolderId = await ensureFolder(projectFolderName, rootFolderId)

  await drive.files.update({ fileId: spreadsheetId, addParents: projectFolderId, removeParents: "root", fields: "id, parents" }).catch(() => {})

  const sections = ["Flooring", "Demo Structural", "Washroom", "Others/Misc", "Hazmat ACM", "Mob/Clean/Demob"]
  const grouped = sections.map(name => ({
    name,
    items: lineItems.filter(i => !i.description.toUpperCase().includes("TOTAL") && classifySection(i.description) === name),
  }))

  const values: (string | number)[][] = []
  values.push(["DeHyl", projectName, "", "", "", "", "", "", "", ""])
  values.push(["Demo Estimate", title, "", "", "", "", "", "", "", ""])
  values.push(["Section", "", "Work Class", "Activity", "Total Units", "Units/Day", "Man-Days", "Labour", "Material 18%", "OH 12%", "Profit 30%", "Total"])
  values.push(["Rates", "", "", "", "", "", "", 296, "", "", "", ""])

  let row = 5
  for (const section of grouped) {
    values.push([section.name, "", "", "", "", "", "", "", "", "", "", ""])
    row += 1
    for (const item of section.items) {
      const estimatedLabour = (item.total || 0) / 1.42
      const estimatedDays = item.man_days ?? (estimatedLabour / 296)
      const unitsPerDay = defaultUnitsPerDay(section.name)
      const units = Number((estimatedDays * unitsPerDay).toFixed(2))
      values.push([
        "", "", section.name, item.description, units, unitsPerDay,
        `=IF(F${row+1}<=0,0,E${row+1}/F${row+1})`,
        `=G${row+1}*$H$4`,
        `=H${row+1}*0.18`,
        `=(H${row+1}+I${row+1})*0.12`,
        `=(H${row+1}+I${row+1})*0.30`,
        `=H${row+1}+I${row+1}+J${row+1}+K${row+1}`,
      ])
      row += 1
    }
  }

  const forceStart = 5
  const forceEnd = row
  values.push(["Crew", "", "Supervisor", "1 @ $45/hr", 1, 1, "", "", "", "", "", ""])
  values.push(["Crew", "", "Workers", "3 @ $35/hr", 3, 1, "", "", "", "", "", ""])
  values.push(["", "", "", "DeHyl Forces Total", "", "", "", "", "", "", "", `=SUM(L${forceStart}:L${forceEnd-1})`])
  row += 3
  const dehylTotalRow = row

  values.push(["Subtrades", "", "Bins", "40YD x $2,800", 1, 2800, "", "", "", "", "", "=E" + (row+1) + "*F" + (row+1)])
  values.push(["Subtrades", "", "PM Hours", "1hr every other day x $95", `=ROUND(G${dehylTotalRow}/2,0)`, 95, "", "", "", "", "", "=E" + (row+2) + "*F" + (row+2)])
  values.push(["Subtrades", "", "Pickup Truck", "ManDays x $90", `=G${dehylTotalRow}`, 90, "", "", "", "", "", "=E" + (row+3) + "*F" + (row+3)])
  values.push(["Subtrades", "", "Small Tools", "ManDays x 8 x $1.81", `=G${dehylTotalRow}*8`, 1.81, "", "", "", "", "", "=E" + (row+4) + "*F" + (row+4)])
  values.push(["", "", "", "Subtrades + 20% markup", "", "", "", "", "", "", "", `=SUM(L${row+1}:L${row+4})*1.2`])
  row += 5
  const subtradeTotalRow = row
  values.push(["", "", "", "Grand Total", "", "", "", "", "", "", "", `=L${dehylTotalRow}+L${subtradeTotalRow}`])

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Sheet1!A1:L200",
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  })

  return { spreadsheetId, spreadsheetUrl }
}
