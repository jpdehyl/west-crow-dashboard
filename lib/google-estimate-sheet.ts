import { google } from "googleapis"
import type { sheets_v4 } from "googleapis"

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

function getPhaseCode(description: string): string {
  const d = description.toLowerCase()
  if (d.includes("floor") || d.includes("vft") || d.includes("vinyl") || d.includes("laminate") || d.includes("vct")) return "010120"
  if (d.includes("drywall") || d.includes("partition") || d.includes("gypsum") || d.includes("gwb")) return "010115"
  if (d.includes("ceiling") || d.includes("t-bar") || d.includes("act") || d.includes("suspended") || d.includes("lay-in")) return "010125"
  if (d.includes("hazmat") || d.includes("acm") || d.includes("asbestos") || d.includes("abatement")) return "010130"
  if (d.includes("concrete") || d.includes("slab") || d.includes("topping") || d.includes("grinding")) return "010135"
  if (d.includes("masonry") || d.includes("brick") || d.includes("block") || d.includes("cmu")) return "010140"
  if (d.includes("storefront") || d.includes("window") || d.includes("glazing")) return "010150"
  if (d.includes("millwork") || d.includes("casework") || d.includes("cabinet")) return "010145"
  if (d.includes("mob") || d.includes("demob") || d.includes("clean") || d.includes("setup") || d.includes("protect")) return "010100"
  if (d.includes("struct") || d.includes("heavy") || d.includes("selective")) return "010110"
  return "010199"
}

function getWorkClass(description: string): string {
  const d = description.toLowerCase()
  if (d.includes("lf") || d.includes("lin ft") || d.includes("linear") || d.includes("storefront") || d.includes("millwork") || d.includes("pipe")) return "LF"
  if (d.includes(" ea") || d.includes("each") || d.includes("fixture")) return "EA"
  if (d.includes("mob") || d.includes("demob") || d.includes("clean") || d.includes(" ls") || d.includes("lump") || d.includes("setup")) return "LS"
  return "SF"
}

function classifyLine(description: string): { unitsPerDay: number } {
  const d = description.toLowerCase()
  if (d.includes("act") || d.includes("ceiling tile") || d.includes("t-bar") || d.includes("suspended") || d.includes("lay-in")) return { unitsPerDay: 1000 }
  if (d.includes("gwb ceiling") || d.includes("drywall ceiling")) return { unitsPerDay: 150 }
  if (d.includes("ceramic") || d.includes("mall tile")) return { unitsPerDay: 150 }
  if (d.includes("floor") || d.includes("vft") || d.includes("vinyl") || d.includes("laminate") || d.includes("vct")) return { unitsPerDay: 200 }
  if (d.includes("tile")) return { unitsPerDay: 200 }
  if (d.includes("drywall") || d.includes("partition") || d.includes("gwb") || d.includes("gypsum")) return { unitsPerDay: 200 }
  if (d.includes("storefront")) return { unitsPerDay: 13 }
  if (d.includes("millwork") || d.includes("casework") || d.includes("cabinet")) return { unitsPerDay: 50 }
  if (d.includes("hazmat") || d.includes("acm") || d.includes("asbestos")) return { unitsPerDay: 150 }
  if (d.includes("mob") || d.includes("demob") || d.includes("clean") || d.includes("setup")) return { unitsPerDay: 1 }
  if (d.includes("washroom") || d.includes("toilet") || d.includes("plumbing")) return { unitsPerDay: 120 }
  if (d.includes("concrete") || d.includes("slab") || d.includes("masonry")) return { unitsPerDay: 150 }
  return { unitsPerDay: 140 }
}

export async function createClarkEstimateSheet(
  projectName: string,
  lineItems: ClarkPricedLineItem[],
  bidId?: string
) {
  const clientId = process.env.GMAIL_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GMAIL_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET
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

  // === DRIVE FOLDER SETUP ===
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
      requestBody: { name, mimeType: "application/vnd.google-apps.folder", parents: parentId ? [parentId] : undefined },
      fields: "id",
    })
    return created.data.id!
  }

  const rootFolderId = await ensureFolder(rootFolderName)
  const projectFolderId = await ensureFolder(projectFolderName, rootFolderId)
  await drive.files.update({ fileId: spreadsheetId, addParents: projectFolderId, removeParents: "root", fields: "id, parents" }).catch(() => {})

  // === BUILD MAIN ESTIMATE TABLE ===
  // Columns: A=Phase Code, B=Work Class, C=Work Activity, D=Total Units, E=Units/Day,
  //          F=Man Days, G=Cost/Man Day, H=Labour, I=Material 10%, J=Material Cost,
  //          K=Total Cost, L=Overhead 12%, M=Profit 30%, N=Total, O=$/Unit, P=Notes
  const values: (string | number)[][] = []

  // Returns the 1-indexed sheet row number of the pushed row
  function addRow(cells: (string | number)[] = []): number {
    values.push(cells)
    return values.length
  }

  // Row 1: Banner
  const BANNER_ROW = addRow(["West Crow", projectName])
  // Row 2: Blank
  addRow()
  // Row 3: Column headers
  const HEADER_ROW = addRow([
    "Phase Code", "Work Class", "Work Activity",
    "Total Units", "Units/Day", "Man Days",
    "Cost/Man Day", "Labour", "Material 18%", "Material Cost",
    "Total Cost", "Overhead 12%", "Profit 30%", "Total", "$/Unit", "Notes",
  ])
  // Row 4: Rates (referenced by line items via absolute refs)
  const RATES_ROW = addRow([
    "", "", "RATES", "", "", "",
    296, "", 0.18, "", "", 0.12, 0.30, "", "", "",
  ])
  // G4 = 296 (Cost/Man Day), I4 = 0.18 (Material), L4 = 0.12 (Overhead), M4 = 0.30 (Profit)

  // === LINE ITEMS (Row 5+) ===
  const LINE_ITEMS_START = values.length + 1
  const filteredItems = lineItems.filter((i) => !i.description.toUpperCase().includes("TOTAL"))

  for (const item of filteredItems) {
    const { unitsPerDay } = classifyLine(item.description)
    const manDays = item.man_days != null ? item.man_days : Math.max(0.5, item.total / 296 / 1.42)
    const totalUnits = Math.round(manDays * unitsPerDay * 100) / 100
    const r = values.length + 1 // 1-indexed row number for this item

    addRow([
      getPhaseCode(item.description),        // A: Phase Code
      getWorkClass(item.description),        // B: Work Class
      item.description,                      // C: Work Activity
      totalUnits,                            // D: Total Units (seed value)
      unitsPerDay,                           // E: Units/Day
      `=D${r}/E${r}`,                       // F: Man Days
      `=$G$${RATES_ROW}`,                   // G: Cost/Man Day (→ $296)
      `=F${r}*G${r}`,                       // H: Labour
      `=$I$${RATES_ROW}`,                   // I: Material % (→ 0.10)
      `=H${r}*I${r}`,                       // J: Material Cost
      `=H${r}+J${r}`,                       // K: Total Cost
      `=$L$${RATES_ROW}`,                   // L: Overhead % (→ 0.12)
      `=$M$${RATES_ROW}`,                   // M: Profit % (→ 0.30)
      `=K${r}*(1+L${r}+M${r})`,            // N: Total
      `=IF(D${r}=0,"",N${r}/D${r})`,       // O: $/Unit
      "",                                    // P: Notes (JP fills)
    ])
  }

  const LINE_ITEMS_END = Math.max(values.length, LINE_ITEMS_START)

  // === SUBTOTALS ROW ===
  const SUBTOTAL_ROW = addRow([
    "", "", "SUBTOTALS", "", "",
    `=SUM(F${LINE_ITEMS_START}:F${LINE_ITEMS_END})`, // F: Man Days total
    "",
    `=SUM(H${LINE_ITEMS_START}:H${LINE_ITEMS_END})`, // H: Labour total
    "",
    `=SUM(J${LINE_ITEMS_START}:J${LINE_ITEMS_END})`, // J: Material Cost total
    `=SUM(K${LINE_ITEMS_START}:K${LINE_ITEMS_END})`, // K: Total Cost total
    "", "",
    `=SUM(N${LINE_ITEMS_START}:N${LINE_ITEMS_END})`, // N: Total
    "", "",
  ])

  addRow() // blank separator

  // === SUB TRADES SECTION ===
  const SUB_TRADES_HEADER_ROW = addRow(["SUB TRADES"])

  // Helper to add a sub trade row: qty × rate → Total (N column)
  function addSubTrade(desc: string, qtyFormula: string | number, rate: number): number {
    const r = values.length + 1
    addRow([
      "010200", "LS", desc,
      typeof qtyFormula === "string" ? qtyFormula : qtyFormula, // D: Qty
      rate,                                                       // E: Rate
      "", "", "", "", "", "", "", "",
      `=D${r}*E${r}`,                                            // N: Total
      "", "",
    ])
    return r
  }

  const BINS_ROW        = addSubTrade("Dumpster Bins (40YD @ $2,800)",          `=ROUND(F${SUBTOTAL_ROW}/5,0)`, 2800)
  const WASTE_ROW       = addSubTrade("Waste Handling & Sorting",               `=F${SUBTOTAL_ROW}`,             150)
  const TRUCK_ROW       = addSubTrade("Pickup Truck (daily)",                   `=F${SUBTOTAL_ROW}`,              90)
  const TOOLS_ROW       = addSubTrade("Small Tools (8 hr/day @ $1.81/hr)",     `=F${SUBTOTAL_ROW}*8`,           1.81)
  const PM_ROW          = addSubTrade("Project Manager",                        `=ROUND(F${SUBTOTAL_ROW}/2,0)`,   95)

  const SUB_TRADES_SUBTOTAL_ROW = addRow([
    "", "", "Sub Trades Subtotal", "", "", "", "", "", "", "", "", "", "",
    `=SUM(N${BINS_ROW}:N${PM_ROW})`, "", "",
  ])
  const SUB_TRADES_MARKUP_ROW = addRow([
    "", "", "Sub Trades + 20% Markup", "", "", "", "", "", "", "", "", "", "",
    `=N${SUB_TRADES_SUBTOTAL_ROW}*1.20`, "", "",
  ])

  // Suppress unused variable warnings
  void WASTE_ROW; void TRUCK_ROW; void TOOLS_ROW

  addRow() // blank separator

  // === ESTIMATE TOTAL SECTION ===
  const EST_HEADER_ROW  = addRow(["ESTIMATE TOTAL"])
  const WC_FORCES_ROW   = addRow(["", "", "West Crow Forces",    "", "", "", "", "", "", "", "", "", "", `=N${SUBTOTAL_ROW}`,             "", ""])
  const SUB_TOTAL_ROW2  = addRow(["", "", "Sub Trades Total",    "", "", "", "", "", "", "", "", "", "", `=N${SUB_TRADES_MARKUP_ROW}`,     "", ""])
  const GRAND_TOTAL_ROW = addRow(["", "", "GRAND ESTIMATE TOTAL","", "", "", "", "", "", "", "", "", "", `=N${WC_FORCES_ROW}+N${SUB_TOTAL_ROW2}`, "", ""])
  const CPM_ROW         = addRow(["", "", "Calculated Cost / Man Day", "", "", "", "", "", "", "", "", "", "", `=IF(F${SUBTOTAL_ROW}=0,0,N${GRAND_TOTAL_ROW}/F${SUBTOTAL_ROW})`, "", ""])

  addRow() // blank

  // === CREW STATS (bottom, columns A-D) ===
  const CREW_HEADER_ROW = addRow(["CREW STATS"])
  const CREW_SIZE_ROW   = addRow(["Crew Size", 5])
  const CREW_DAYS_ROW   = addRow(["Crew Days",  `=F${SUBTOTAL_ROW}/B${CREW_SIZE_ROW}`])
  const CREW_WEEKS_ROW  = addRow(["Crew Weeks", `=B${CREW_DAYS_ROW}/5`])
  addRow(["Sub $/Worker", `=IF(B${CREW_DAYS_ROW}=0,0,N${GRAND_TOTAL_ROW}/B${CREW_DAYS_ROW})`])

  // Suppress unused variable warnings
  void CREW_WEEKS_ROW

  // === WRITE DATA ===
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Sheet1!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  })

  // === FORMATTING via batchUpdate ===
  const sheetId = 0

  const yellowBg:    sheets_v4.Schema$Color = { red: 1,    green: 0.898, blue: 0.2,   alpha: 1 }
  const lightGrayBg: sheets_v4.Schema$Color = { red: 0.85, green: 0.85,  blue: 0.85,  alpha: 1 }
  const lightBlueBg: sheets_v4.Schema$Color = { red: 0.8,  green: 0.898, blue: 1.0,   alpha: 1 }

  const currencyFmt: sheets_v4.Schema$NumberFormat = { type: "CURRENCY", pattern: '"$"#,##0.00' }

  function rowRange(r: number, c0 = 0, c1 = 16): sheets_v4.Schema$GridRange {
    return { sheetId, startRowIndex: r - 1, endRowIndex: r, startColumnIndex: c0, endColumnIndex: c1 }
  }

  const formatRequests: sheets_v4.Schema$Request[] = [
    // ── Banner row: yellow, bold, large
    {
      repeatCell: {
        range: rowRange(BANNER_ROW),
        cell: {
          userEnteredFormat: {
            backgroundColor: yellowBg,
            textFormat: { bold: true, fontSize: 14 },
            horizontalAlignment: "CENTER",
            verticalAlignment: "MIDDLE",
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
      },
    },
    // Banner row height
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: "ROWS", startIndex: 0, endIndex: 1 },
        properties: { pixelSize: 40 },
        fields: "pixelSize",
      },
    },
    // ── Header row: gray, bold, center
    {
      repeatCell: {
        range: rowRange(HEADER_ROW),
        cell: {
          userEnteredFormat: {
            backgroundColor: lightGrayBg,
            textFormat: { bold: true },
            horizontalAlignment: "CENTER",
            wrapStrategy: "WRAP",
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,wrapStrategy)",
      },
    },
    // ── Rates row: bold italic
    {
      repeatCell: {
        range: rowRange(RATES_ROW),
        cell: {
          userEnteredFormat: { textFormat: { bold: true, italic: true } },
        },
        fields: "userEnteredFormat(textFormat)",
      },
    },
    // ── Subtotals row: blue, bold
    {
      repeatCell: {
        range: rowRange(SUBTOTAL_ROW),
        cell: {
          userEnteredFormat: { backgroundColor: lightBlueBg, textFormat: { bold: true } },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat)",
      },
    },
    // ── Sub Trades header: gray, bold
    {
      repeatCell: {
        range: rowRange(SUB_TRADES_HEADER_ROW),
        cell: {
          userEnteredFormat: { backgroundColor: lightGrayBg, textFormat: { bold: true, fontSize: 11 } },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat)",
      },
    },
    // ── Sub Trades markup row: blue, bold
    {
      repeatCell: {
        range: rowRange(SUB_TRADES_MARKUP_ROW),
        cell: {
          userEnteredFormat: { backgroundColor: lightBlueBg, textFormat: { bold: true } },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat)",
      },
    },
    // ── Estimate Total header: gray, bold
    {
      repeatCell: {
        range: rowRange(EST_HEADER_ROW),
        cell: {
          userEnteredFormat: { backgroundColor: lightGrayBg, textFormat: { bold: true, fontSize: 11 } },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat)",
      },
    },
    // ── Grand Total row: yellow, bold
    {
      repeatCell: {
        range: rowRange(GRAND_TOTAL_ROW),
        cell: {
          userEnteredFormat: { backgroundColor: yellowBg, textFormat: { bold: true, fontSize: 12 } },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat)",
      },
    },
    // ── Crew stats header: gray, bold
    {
      repeatCell: {
        range: rowRange(CREW_HEADER_ROW),
        cell: {
          userEnteredFormat: { backgroundColor: lightGrayBg, textFormat: { bold: true } },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat)",
      },
    },
    // ── Currency: G4 (rate $296)
    {
      repeatCell: {
        range: rowRange(RATES_ROW, 6, 7),
        cell: { userEnteredFormat: { numberFormat: currencyFmt } },
        fields: "userEnteredFormat(numberFormat)",
      },
    },
    // ── Currency: H (Labour), J (Material Cost), K (Total Cost), N (Total), O ($/Unit)
    // across all data rows
    ...[7, 9, 10, 13, 14].map((col) => ({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: LINE_ITEMS_START - 1,
          endRowIndex: CPM_ROW,
          startColumnIndex: col,
          endColumnIndex: col + 1,
        },
        cell: { userEnteredFormat: { numberFormat: currencyFmt } },
        fields: "userEnteredFormat(numberFormat)",
      },
    })),
    // ── Currency: N column for sub trades, estimate totals
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: BINS_ROW - 1,
          endRowIndex: CPM_ROW,
          startColumnIndex: 13,
          endColumnIndex: 14,
        },
        cell: { userEnteredFormat: { numberFormat: currencyFmt } },
        fields: "userEnteredFormat(numberFormat)",
      },
    },
    // ── Column widths
    { updateDimensionProperties: { range: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: 1 }, properties: { pixelSize: 80  }, fields: "pixelSize" } },
    { updateDimensionProperties: { range: { sheetId, dimension: "COLUMNS", startIndex: 1, endIndex: 2 }, properties: { pixelSize: 70  }, fields: "pixelSize" } },
    { updateDimensionProperties: { range: { sheetId, dimension: "COLUMNS", startIndex: 2, endIndex: 3 }, properties: { pixelSize: 280 }, fields: "pixelSize" } },
    { updateDimensionProperties: { range: { sheetId, dimension: "COLUMNS", startIndex: 3, endIndex: 15}, properties: { pixelSize: 90  }, fields: "pixelSize" } },
    { updateDimensionProperties: { range: { sheetId, dimension: "COLUMNS", startIndex: 15,endIndex: 16}, properties: { pixelSize: 150 }, fields: "pixelSize" } },
    // ── Freeze: top 4 rows, left 2 cols
    {
      updateSheetProperties: {
        properties: { sheetId, gridProperties: { frozenRowCount: 4, frozenColumnCount: 2 } },
        fields: "gridProperties(frozenRowCount,frozenColumnCount)",
      },
    },
    // ── Border around line-items section
    ...(LINE_ITEMS_END >= LINE_ITEMS_START
      ? [
          {
            updateBorders: {
              range: {
                sheetId,
                startRowIndex: LINE_ITEMS_START - 1,
                endRowIndex: LINE_ITEMS_END,
                startColumnIndex: 0,
                endColumnIndex: 16,
              },
              top:             { style: "SOLID_MEDIUM", colorStyle: { rgbColor: { red: 0.4, green: 0.4, blue: 0.4 } } },
              bottom:          { style: "SOLID_MEDIUM", colorStyle: { rgbColor: { red: 0.4, green: 0.4, blue: 0.4 } } },
              left:            { style: "SOLID_MEDIUM", colorStyle: { rgbColor: { red: 0.4, green: 0.4, blue: 0.4 } } },
              right:           { style: "SOLID_MEDIUM", colorStyle: { rgbColor: { red: 0.4, green: 0.4, blue: 0.4 } } },
              innerHorizontal: { style: "SOLID",        colorStyle: { rgbColor: { red: 0.75, green: 0.75, blue: 0.75 } } },
              innerVertical:   { style: "SOLID",        colorStyle: { rgbColor: { red: 0.75, green: 0.75, blue: 0.75 } } },
            },
          } as sheets_v4.Schema$Request,
        ]
      : []),
  ]

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: formatRequests },
  })

  // === CONFIG SHEET (hidden, stores bidId for Apps Script webhook) ===
  if (bidId) {
    const addSheetResponse = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: "Config" } } }] },
    })
    const configSheetId = addSheetResponse.data.replies?.[0]?.addSheet?.properties?.sheetId
    if (configSheetId !== undefined && configSheetId !== null) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Config!A1:A2",
        valueInputOption: "RAW",
        requestBody: { values: [["bidId"], [bidId]] },
      })
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ updateSheetProperties: { properties: { sheetId: configSheetId, hidden: true }, fields: "hidden" } }],
        },
      })
    }
  }

  return { spreadsheetId, spreadsheetUrl }
}
