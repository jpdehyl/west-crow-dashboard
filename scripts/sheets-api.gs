// ══════════════════════════════════════════════════════════════════════════
// West Crow Dashboard — Google Apps Script Backend
// ══════════════════════════════════════════════════════════════════════════
// INSTRUCTIONS:
//   1. Open the Google Sheet
//   2. Extensions → Apps Script
//   3. Delete default code, paste this entire file
//   4. Run setup() once (first time only — creates tabs + seeds data)
//   5. Deploy → New deployment → Web App
//      - Execute as: Me
//      - Who has access: Anyone
//   6. Copy the Web App URL → add to Vercel env as SHEETS_API_URL
// ══════════════════════════════════════════════════════════════════════════

const SHEET_ID = '1O9_iZMi_jL8pKAlTHBnSZhND0kKkyvsk5Ghzm_XLaag'
const API_KEY  = 'wc_2026_xK9mP'  // Change this — paste same value in Vercel env as SHEETS_API_KEY

// ── HTTP Handlers ─────────────────────────────────────────────────────────

function doGet(e)  { if (!e) return out({ error: 'Run setup() from editor, not doGet' }); return route(e, (e.parameter || {}).method || 'GET')  }
function doPost(e) { if (!e) return out({ error: 'Use web app URL' }); return route(e, (e.parameter || {}).method || 'POST') }

function route(e, method) {
  if ((e.parameter || {}).key !== API_KEY) return out({ error: 'Unauthorized' }, 401)

  const path = (e.parameter || {}).path || ''
  const body = (method === 'POST' || method === 'PATCH') && e.postData
    ? JSON.parse(e.postData.contents)
    : {}

  try {
    // BIDS
    if (path === 'bids' && method === 'GET')    return out(getBids())
    if (path === 'bids' && method === 'POST')   return out(createBid(body))
    const bidId = path.match(/^bids\/([^/]+)$/)
    if (bidId && method === 'GET')   return out(getBid(bidId[1]))
    if (bidId && method === 'PATCH') return out(updateBid(bidId[1], body))

    // PROJECTS
    if (path === 'projects' && method === 'GET') return out(getProjects())
    const logM  = path.match(/^projects\/([^/]+)\/logs$/)
    const costM = path.match(/^projects\/([^/]+)\/costs$/)
    const invM  = path.match(/^projects\/([^/]+)\/invoices$/)
    if (logM  && method === 'POST')  return out(addLog(logM[1], body))
    if (costM && method === 'POST')  return out(addCost(costM[1], body))
    if (invM  && method === 'POST')  return out(createInvoice(invM[1], body))
    if (invM  && method === 'PATCH') return out(updateInvoice(invM[1], body))

    // BID DOCUMENTS
    const docM = path.match(/^bids\/([^/]+)\/documents$/)
    if (docM && method === 'POST') return out(addDocument(docM[1], body))

    // BID TIMELINE (manual log entry)
    const tlM = path.match(/^bids\/([^/]+)\/timeline$/)
    if (tlM && method === 'POST') return out(addBidTimeline(tlM[1], body))

    // CLIENTS
    if (path === 'clients' && method === 'GET')  return out(getClients())
    if (path === 'clients' && method === 'POST') return out(createClient(body))

    return out({ error: 'Not found: ' + path }, 404)
  } catch(err) {
    return out({ error: err.toString() }, 500)
  }
}

function out(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}

// ── Sheet Helpers ─────────────────────────────────────────────────────────

function ss()          { return SpreadsheetApp.openById(SHEET_ID) }
function tab(name)     { return ss().getSheetByName(name) }

function toObjects(name) {
  const sh = tab(name)
  if (!sh) return []
  const data = sh.getDataRange().getValues()
  if (data.length < 2) return []
  const [headers, ...rows] = data
  return rows
    .filter(r => r[0] !== '' && r[0] !== null)
    .map(row => {
      const obj = {}
      headers.forEach((h, i) => { obj[h] = row[i] === '' ? null : row[i] })
      return obj
    })
}

function appendRow(name, obj) {
  const sh = tab(name)
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
  sh.appendRow(headers.map(h => obj[h] !== undefined ? obj[h] : ''))
}

function updateCells(name, idField, idValue, updates) {
  const sh   = tab(name)
  const data = sh.getDataRange().getValues()
  const hdrs = data[0]
  const idCol = hdrs.indexOf(idField)
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(idValue)) {
      Object.entries(updates).forEach(([k, v]) => {
        const col = hdrs.indexOf(k)
        if (col >= 0) sh.getRange(i + 1, col + 1).setValue(v === null ? '' : v)
      })
      return true
    }
  }
  return false
}

function uid(prefix) { return prefix + '_' + Date.now() }
function today()     { return new Date().toISOString().split('T')[0] }

// ── BIDS ──────────────────────────────────────────────────────────────────

function getBids() {
  const bids     = toObjects('Bids')
  const timeline = toObjects('BidTimeline')
  const docs     = toObjects('BidDocuments')
  return bids.map(b => ({
    ...b,
    bid_value:  Number(b.bid_value),
    margin_pct: b.margin_pct !== null ? Number(b.margin_pct) : null,
    timeline:   timeline.filter(t => t.bid_id === b.id),
    documents:  docs.filter(d => d.bid_id === b.id),
  }))
}

function getBid(id) {
  return getBids().find(b => b.id === id) || null
}

function createBid(data) {
  const id  = 'b' + Date.now()
  const bid = {
    id,
    project_name:    data.project_name,
    client:          data.client,
    client_id:       data.client_id || '',
    bid_value:       data.bid_value,
    deadline:        data.deadline,
    status:          'active',
    margin_pct:      '',
    estimator:       data.estimator || 'JP',
    notes:           data.notes || '',
    dropbox_folder:  data.dropbox_folder || '',
    created_at:      new Date().toISOString(),
  }
  appendRow('Bids', bid)
  appendRow('BidTimeline', {
    id: uid('tl'), bid_id: id,
    stage: 'invited', date: today(),
    note: 'Bid created — ' + data.source,
    by:   data.estimator || 'JP',
  })
  return bid
}

function updateBid(id, data) {
  const allowed = ['status','project_name','client','client_id','bid_value','deadline','margin_pct','notes','estimator','estimate_data','dropbox_folder']
  const updates = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)))
  updateCells('Bids', 'id', id, updates)

  // Auto-log timeline events on status changes
  const stageMap = { sent: 'submitted', won: 'decision', lost: 'decision', 'no-bid': 'decision' }
  if (data.status && stageMap[data.status]) {
    appendRow('BidTimeline', {
      id: uid('tl'), bid_id: id,
      stage: stageMap[data.status], date: today(),
      note: data.note || 'Status → ' + data.status,
      by:   data.by || 'JP',
    })
  }
  return getBid(id)
}

// ── PROJECTS ──────────────────────────────────────────────────────────────

function getProjects() {
  const projects = toObjects('Projects')
  const logs     = toObjects('DailyLogs')
  const costs    = toObjects('Costs')
  const invoices = toObjects('Invoices')

  return projects.map(p => ({
    ...p,
    contract_value:   Number(p.contract_value),
    budget_labour:    Number(p.budget_labour),
    budget_materials: Number(p.budget_materials),
    budget_equipment: Number(p.budget_equipment),
    budget_subs:      Number(p.budget_subs),
    estimate_total:   Number(p.estimate_total),
    daily_logs: logs
      .filter(l => l.project_id === p.id)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .map(l => ({ ...l, hours: Number(l.hours), photos: l.photos ? Number(l.photos) : undefined, crew: l.crew ? String(l.crew).split(',') : [] })),
    costs: costs
      .filter(c => c.project_id === p.id)
      .map(c => ({ ...c, amount: Number(c.amount) })),
    invoices: invoices
      .filter(i => i.project_id === p.id)
      .map(i => ({ ...i, gross_amount: Number(i.gross_amount), holdback_pct: Number(i.holdback_pct) })),
  }))
}

function addLog(projectId, data) {
  const log = {
    id:             uid('dl'),
    project_id:     projectId,
    date:           data.date,
    crew:           Array.isArray(data.crew) ? data.crew.join(',') : data.crew,
    hours:          data.hours,
    work_performed: data.work_performed,
    weather:        data.weather || '',
    issues:         data.issues  || '',
    photos:         data.photos  || '',
  }
  appendRow('DailyLogs', log)
  return { ...log, crew: Array.isArray(data.crew) ? data.crew : [data.crew] }
}

function addCost(projectId, data) {
  const cost = {
    id:          uid('cost'),
    project_id:  projectId,
    date:        data.date,
    description: data.description,
    amount:      data.amount,
    category:    data.category,
    vendor:      data.vendor || '',
  }
  appendRow('Costs', cost)
  return cost
}

function createInvoice(projectId, data) {
  const inv = {
    id:                    uid('inv'),
    project_id:            projectId,
    number:                data.number,
    type:                  data.type || 'progress',
    gross_amount:          data.gross_amount,
    holdback_pct:          data.holdback_pct || 10,
    sent_date:             data.sent_date || '',
    paid_date:             '',
    holdback_release_date: '',
    notes:                 data.notes || '',
  }
  appendRow('Invoices', inv)
  return inv
}

function updateInvoice(projectId, data) {
  updateCells('Invoices', 'id', data.id, {
    sent_date:             data.sent_date             || '',
    paid_date:             data.paid_date             || '',
    holdback_release_date: data.holdback_release_date || '',
  })
  return { ok: true }
}

// ── CLIENTS ───────────────────────────────────────────────────────────────

function getClients() { return toObjects('Clients') }

function addDocument(bidId, data) {
  const doc = {
    id:     uid('doc'),
    bid_id: bidId,
    name:   data.name,
    url:    data.url,
    type:   data.type || 'bid_docs',
  }
  appendRow('BidDocuments', doc)
  return doc
}

function addBidTimeline(bidId, data) {
  const entry = {
    id:     uid('tl'),
    bid_id: bidId,
    stage:  data.stage || 'estimating',
    date:   today(),
    note:   data.note || '',
    by:     data.by   || 'system',
  }
  appendRow('BidTimeline', entry)
  return entry
}

function createClient(data) {
  const client = {
    id:           'c' + Date.now(),
    name:         data.name,
    contact_name: data.contact_name || '',
    email:        data.email        || '',
    phone:        data.phone        || '',
    type:         data.type         || 'commercial',
  }
  appendRow('Clients', client)
  return client
}

// ══════════════════════════════════════════════════════════════════════════
// SETUP — Run once from Apps Script editor (not via web app)
// ══════════════════════════════════════════════════════════════════════════

function setup() {
  const spreadsheet = ss()
  const TABS = {
    Bids:         ['id','project_name','client','client_id','bid_value','deadline','status','margin_pct','estimator','notes','dropbox_folder','created_at','estimate_data'],
    BidTimeline:  ['id','bid_id','stage','date','note','by'],
    BidDocuments: ['id','bid_id','name','url','type'],
    Projects:     ['id','bid_id','project_name','client','client_id','contract_value','start_date','end_date','status','estimator','superintendent','po_number','contract_signed_date','budget_labour','budget_materials','budget_equipment','budget_subs','estimate_total'],
    DailyLogs:    ['id','project_id','date','crew','hours','work_performed','weather','issues','photos'],
    Costs:        ['id','project_id','date','description','amount','category','vendor'],
    Invoices:     ['id','project_id','number','type','gross_amount','holdback_pct','sent_date','paid_date','holdback_release_date','notes'],
    Clients:      ['id','name','contact_name','email','phone','type'],
  }

  // Create tabs
  Object.entries(TABS).forEach(([name, headers]) => {
    let sh = spreadsheet.getSheetByName(name)
    if (!sh) sh = spreadsheet.insertSheet(name)
    sh.clearContents()
    sh.getRange(1, 1, 1, headers.length).setValues([headers])
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold')
    sh.setFrozenRows(1)
  })

  // Remove default Sheet1 if it exists
  const def = spreadsheet.getSheetByName('Sheet1')
  if (def && spreadsheet.getSheets().length > 1) spreadsheet.deleteSheet(def)

  // ── Seed: Clients (real West Crow clients from Dropbox analysis)
  const clients = [
    ['c1','TD Bank','','','','commercial'],
    ['c2','RBC','','','','commercial'],
    ['c3','Scotiabank','','','','commercial'],
    ['c4','Vancouver Community College','','','','commercial'],
    ['c5','UBC','','','','commercial'],
    ['c6','Vancouver Coastal Health','','','','commercial'],
    ['c7','Lululemon','','','','commercial'],
    ['c8','Teck Resources','','','','industrial'],
    ["c9","McDonald's Canada",'','','','commercial'],
    ['c10','City of Burnaby','','','','commercial'],
    ['c11','Armstrong Simpson','','','','commercial'],
    ['c12','CFIA (Federal Government)','','','','commercial'],
    ['c13','Richardson International','','','','commercial'],
    ['c14','KPU','','','','commercial'],
    ['c15','District of North Vancouver','','','','commercial'],
  ]
  spreadsheet.getSheetByName('Clients').getRange(2,1,clients.length,clients[0].length).setValues(clients)

  // ── Seed: Bids (real WCC projects from Dropbox; 2 bids have confirmed real values)
  // Columns: id, project_name, client, client_id, bid_value, deadline, status, margin_pct, estimator, notes, dropbox_folder, created_at, estimate_data
  const bids = [
    ['b1','VCC W Pender Washroom Renovation','Vancouver Community College','c4',0,'2026-03-18','active','','JP','Washroom renovation scope. Drawings + hazmat report in Dropbox.','VCC W Pender Washroom Renovation','2026-02-20T09:00:00Z',''],
    ['b2','Lululemon TI 1380 Burrard St 5th Floor','Lululemon','c7',0,'2026-03-14','active','','JP','TI scope, 5th floor office. Drawings in Dropbox.','Lululemon TI 1380 Burrard St 5th floor Project','2026-02-18T10:00:00Z',''],
    ['b3','TD West Hastings Branch Refresh','TD Bank','c1',0,'2026-03-21','active','','JP','Branch TI refresh. Standard WCC TD scope.','TD West Hastings','2026-02-22T08:00:00Z',''],
    ['b4','RBC DS Thurlow 19th & 20th Floor Reconfiguration','RBC','c2',0,'2026-03-28','active','','JP','Multi-floor office TI. Large scope — 2 floors.','RBC DS Thurlow 19th and 20th Floor Reconfiguration','2026-02-24T09:00:00Z',''],
    ['b5','Teck Resources Level 34 & 35 — Phase 2 & 3','Teck Resources','c8',0,'2026-03-25','active','','JP','Multi-phase high-rise TI. Phase 2 & 3 of ongoing project.','Teck Resources Level 34 &35 - Phase 2 and 3','2026-02-25T11:00:00Z',''],
    ['b6','Armstrong Simpson 830 West Broadway','Armstrong Simpson','c11',0,'2026-04-02','active','','JP','Office TI tender. Drawings received.','Armstrong Simpson tender - 830 999 West Broadway','2026-02-26T08:00:00Z',''],
    ['b7','Scotiabank Park Royal Branch Reno','Scotiabank','c3',28500,'2026-02-28','sent','','JP','Bank branch TI. Standard finishes + partitions. Bid sent.','Scotiabank Park Royal','2026-02-10T09:00:00Z',''],
    ['b8','TD Norgate North Vancouver Reno','TD Bank','c1',22000,'2026-02-25','sent','','JP','Small branch refresh. Flooring + partitions.','TD Norgate North Vancouver Reno','2026-02-08T10:00:00Z',''],
    ['b9','Gender Neutral Washroom Refit — CFIA','CFIA (Federal Government)','c12',4716,'2025-09-15','won',11,'Francisco','','Gender Neutral Accessible Washroom Refit for CFIA','2025-09-01T09:00:00Z',''],
    ['b10','Richardson International North Vancouver','Richardson International','c13',2511,'2023-08-20','won',11,'Francisco','','Richardson International North Vancouver','2023-08-10T09:00:00Z',''],
    ['b11','UBC Henry Angus Building Renovation','UBC','c5',47200,'2024-10-15','won',18,'Francisco','Multi-room TI. Partitions, T-bar, flooring, washrooms. Government multiplier applied.','24-63 UBC - Henry Angus Renovation - 2053 Main Mal','2024-09-30T09:00:00Z',''],
    ['b12','City of Burnaby Montague Moore Exterior Rehab','City of Burnaby','c10',89400,'2024-11-20','won',20,'Francisco','Exterior envelope rehab + interior demo. Large multi-scope.','24-72 City of Burnaby Montague Moore Exterior Envelope Rehab - 5165 Sperling Ave','2024-11-01T09:00:00Z',''],
    ['b13','VCH UBCH Koerner Radiology Rooms 2 & 3','Vancouver Coastal Health','c6',63000,'2025-06-10','lost','','Francisco','Hospital environment — 50% labour premium. Outbid on final price.','VCH UBCH Koerner Radiology Room 2 & 3 Renovation - 2211 Wesbrook Mall','2025-05-25T09:00:00Z',''],
    ['b14','Richmond Centre TI Renovation','Lululemon','c7',0,'2026-02-14','no-bid','','JP','Scope too large for current capacity. Passed.','Richmond Centre','2026-02-05T09:00:00Z',''],
  ]
  spreadsheet.getSheetByName('Bids').getRange(2,1,bids.length,bids[0].length).setValues(bids)

  // ── Seed: BidTimeline
  const timeline = [
    ['tl_b1_1','b1','invited','2026-02-20','Bid invite received — VCC facilities','Ean'],
    ['tl_b1_2','b1','estimating','2026-02-24','Takeoff started, drawings reviewed','JP'],
    ['tl_b2_1','b2','invited','2026-02-18','Bid invite received','Ean'],
    ['tl_b2_2','b2','estimating','2026-02-22','Drawings downloaded, estimate in progress','JP'],
    ['tl_b3_1','b3','invited','2026-02-22','TD Bank bid invite received','Ean'],
    ['tl_b4_1','b4','invited','2026-02-24','Bid invite — 2-floor TI, priority scope','Ean'],
    ['tl_b5_1','b5','invited','2026-02-25','Phase 2 & 3 invite from Teck PM','Ean'],
    ['tl_b6_1','b6','invited','2026-02-26','Tender received from Armstrong Simpson','Ean'],
    ['tl_b7_1','b7','invited','2026-02-10','Bid invite received','Ean'],
    ['tl_b7_2','b7','estimating','2026-02-12','Takeoff complete','Francisco'],
    ['tl_b7_3','b7','submitted','2026-02-19','Bid submitted $28,500','Francisco'],
    ['tl_b8_1','b8','invited','2026-02-08','TD Norgate bid invite','Ean'],
    ['tl_b8_2','b8','estimating','2026-02-10','Small scope, quick takeoff','Francisco'],
    ['tl_b8_3','b8','submitted','2026-02-16','Bid submitted $22,000','Francisco'],
    ['tl_b9_1','b9','invited','2025-09-01','CFIA washroom bid invite received','Ean'],
    ['tl_b9_2','b9','estimating','2025-09-05','Hazmat report confirmed lead tile','Francisco'],
    ['tl_b9_3','b9','submitted','2025-09-08','Bid submitted $4,716','Francisco'],
    ['tl_b9_4','b9','decision','2025-09-12','WON — awarded','Dave'],
    ['tl_b10_1','b10','invited','2023-08-10','Bid invite received','Ean'],
    ['tl_b10_2','b10','submitted','2023-08-15','Bid submitted $2,511','Francisco'],
    ['tl_b10_3','b10','decision','2023-08-20','WON — awarded','Dave'],
    ['tl_b11_1','b11','invited','2024-09-30','UBC bid invite received','Ean'],
    ['tl_b11_2','b11','submitted','2024-10-10','Bid submitted $47,200','Francisco'],
    ['tl_b11_3','b11','decision','2024-10-15','WON — lowest compliant bid','Dave'],
    ['tl_b12_1','b12','invited','2024-11-01','City of Burnaby RFP received','Ean'],
    ['tl_b12_2','b12','submitted','2024-11-15','Bid submitted $89,400','Francisco'],
    ['tl_b12_3','b12','decision','2024-11-20','WON — awarded','Dave'],
    ['tl_b13_1','b13','invited','2025-05-25','VCH Koerner hospital bid invite','Ean'],
    ['tl_b13_2','b13','submitted','2025-06-05','Bid submitted $63,000','Francisco'],
    ['tl_b13_3','b13','decision','2025-06-10','LOST — outbid','Dave'],
    ['tl_b14_1','b14','invited','2026-02-05','Richmond Centre invite received','Ean'],
    ['tl_b14_2','b14','decision','2026-02-07','NO BID — capacity constraints','JP'],
  ]
  spreadsheet.getSheetByName('BidTimeline').getRange(2,1,timeline.length,timeline[0].length).setValues(timeline)

  // ── Seed: Projects (empty — populated as JP wins bids starting March 2026)
  // No seed data — projects are created live when POs are issued

  // DailyLogs, Costs, Invoices — no seed; populated live as jobs are executed.

  Logger.log('West Crow Dashboard setup complete! Real WCC clients + bids loaded.')
}
