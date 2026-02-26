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

function doGet(e)  { return route(e, (e.parameter || {}).method || 'GET')  }  // ← must be doGet
function doPost(e) { return route(e, (e.parameter || {}).method || 'POST') } // ← must be doPost

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
    project_name: data.project_name,
    client:       data.client,
    client_id:    data.client_id || '',
    bid_value:    data.bid_value,
    deadline:     data.deadline,
    status:       'active',
    margin_pct:   '',
    estimator:    data.estimator || 'JP',
    notes:        data.notes || '',
    created_at:   new Date().toISOString(),
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
  const allowed = ['status','project_name','client','client_id','bid_value','deadline','margin_pct','notes','estimator']
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
    Bids:         ['id','project_name','client','client_id','bid_value','deadline','status','margin_pct','estimator','notes','created_at'],
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

  // ── Seed: Clients
  const clients = [
    ['c1','Pacific Properties Ltd.','Mark Holloway','mark@pacificprop.ca','604-555-0101','commercial'],
    ['c2','Westside Developments','Sandra Lee','sandra@westsidedev.ca','604-555-0142','commercial'],
    ['c3','Harbour Industrial Group','Tom Richter','trichter@harbourind.ca','604-555-0188','industrial'],
    ['c4','Starlight Hotel Group','Angela Park','apark@starlighthg.com','604-555-0199','commercial'],
    ['c5','Apex Construction','Derek Simms','derek@apexconstruction.ca','604-555-0131','commercial'],
    ['c6','Street Level Contracting','Ryan Hooper','ryan@streetlevel.ca','604-555-0177','commercial'],
    ['c7','Metro Vancouver Schools','Diane Patel','dpatel@vsb.bc.ca','604-555-0214','commercial'],
  ]
  spreadsheet.getSheetByName('Clients').getRange(2,1,clients.length,clients[0].length).setValues(clients)

  // ── Seed: Bids
  const bids = [
    ['b1','Burnaby Office Demolition','Pacific Properties Ltd.','c1',148000,'2026-03-05','active','','JP','Full interior demo, 4 floors. HAZMAT assessment required. Client wants 24/7 ops considered.','2026-02-20T10:00:00Z'],
    ['b2','Coquitlam Retail Reno','Westside Developments','c2',62500,'2026-03-10','sent','','JP','Selective demo, storefront strip-out. Quick turnaround expected.','2026-02-18T09:00:00Z'],
    ['b3','North Van Warehouse Clear','Harbour Industrial Group','c3',215000,'2026-02-28','won',34,'JP','Full clear & abatement. PO received. Crew mobilizing March 3.','2026-02-10T08:00:00Z'],
    ['b4','Richmond Hotel Fit-Out','Starlight Hotel Group','c4',390000,'2026-03-15','active','','JP','180 room demo. Tight schedule, 24/7 ops. Review subcontractor pricing before submitting.','2026-02-22T11:30:00Z'],
    ['b5','Surrey Mixed-Use Phase 2','Apex Construction','c5',88000,'2026-03-20','no-bid','','JP','Margin too tight at their target price. Passed.','2026-02-15T14:00:00Z'],
    ['b6','5575 Patterson Ave Demo','Street Level Contracting','c6',175000,'2026-03-08','sent','','JP','Full residential teardown, heritage property — asbestos likely.','2026-02-23T09:00:00Z'],
    ['b7','Burnaby Secondary Abatement','Metro Vancouver Schools','c7',195000,'2026-02-10','won',29,'JP','Asbestos abatement — 3 floors, occupied building. Must coordinate with school calendar.','2026-01-28T09:00:00Z'],
  ]
  spreadsheet.getSheetByName('Bids').getRange(2,1,bids.length,bids[0].length).setValues(bids)

  // ── Seed: BidTimeline
  const timeline = [
    ['tl_b1_1','b1','invited','2026-02-20','Bid invite received via email','Ean'],
    ['tl_b1_2','b1','estimating','2026-02-22','Started takeoff — drawings uploaded','JP'],
    ['tl_b2_1','b2','invited','2026-02-18','Bid invite received','Ean'],
    ['tl_b2_2','b2','estimating','2026-02-19','Estimate completed','JP'],
    ['tl_b2_3','b2','submitted','2026-02-21','Bid submitted $62,500','JP'],
    ['tl_b3_1','b3','invited','2026-02-10','Bid invite received','Ean'],
    ['tl_b3_2','b3','estimating','2026-02-12','Clark estimate drafted, approved by JP','JP'],
    ['tl_b3_3','b3','submitted','2026-02-14','Bid submitted $215,000','JP'],
    ['tl_b3_4','b3','decision','2026-02-22','WON — PO received','JP'],
    ['tl_b4_1','b4','invited','2026-02-22','Bid invite received — large job, flagged as priority','Ean'],
    ['tl_b4_2','b4','estimating','2026-02-24','Clark working on estimate','JP'],
    ['tl_b5_1','b5','invited','2026-02-15','Bid invite received','Ean'],
    ['tl_b5_2','b5','decision','2026-02-17','NO BID — insufficient margin','JP'],
    ['tl_b6_1','b6','invited','2026-02-23','Bid invite received from Ryan Hooper','Ean'],
    ['tl_b6_2','b6','estimating','2026-02-24','Pending hazmat report','JP'],
    ['tl_b6_3','b6','submitted','2026-02-25','Bid submitted — conditional on hazmat confirmation','JP'],
    ['tl_b7_1','b7','invited','2026-01-28','RFP received via VSB procurement portal','Ean'],
    ['tl_b7_2','b7','estimating','2026-01-30','Hazmat report reviewed, takeoff complete','JP'],
    ['tl_b7_3','b7','submitted','2026-02-05','Bid submitted $195,000','JP'],
    ['tl_b7_4','b7','decision','2026-02-14','WON — lowest compliant bid. PO issued.','JP'],
  ]
  spreadsheet.getSheetByName('BidTimeline').getRange(2,1,timeline.length,timeline[0].length).setValues(timeline)

  // ── Seed: Projects
  const projects = [
    ['p2','b7','Burnaby Secondary Abatement','Metro Vancouver Schools','c7',195000,'2026-02-17','2026-03-14','active','JP','Oscar','VSB-2026-0089','2026-02-15',110000,18000,12000,28000,195000],
    ['p1','b3','North Van Warehouse Clear','Harbour Industrial Group','c3',215000,'2026-03-03','2026-03-28','active','JP','Oscar','HIG-2026-042','2026-02-23',130000,25000,15000,35000,215000],
  ]
  spreadsheet.getSheetByName('Projects').getRange(2,1,projects.length,projects[0].length).setValues(projects)

  // ── Seed: DailyLogs
  const logs = [
    ['dl4','p2','2026-02-17','Oscar,Crew x3',32,'Site mobilization complete. Decon unit installed at east loading dock. Level 1 access confirmed with VSB facilities manager.','Clear','',6],
    ['dl5','p2','2026-02-18','Oscar,Crew x3',32,'VCT floor tile removal Level 1 — 1800 SF completed. Mastic residue under tile noted.','Clear','',11],
    ['dl6','p2','2026-02-19','Oscar,Crew x3',32,'Ceiling tile removal Level 1 — 900 SF. HEPA vacuuming. Air clearance test #1 passed.','Rain','Air monitoring showed elevated fibers (0.04 f/cc) in Level 1 south corridor at 10 AM. Additional containment installed. Re-test cleared at 2 PM. No stoppage.',8],
    ['dl7','p2','2026-02-20','Oscar,Crew x4',40,'Level 2 containment fully erected. VCT removal started — 900 SF complete.','Overcast','',9],
    ['dl8','p2','2026-02-23','Oscar,Crew x4',40,'VCT removal Level 2 complete (1800 SF). Air clearance test #2 passed.','Clear','',7],
    ['dl9','p2','2026-02-24','Oscar,Crew x3',32,'Ceiling tiles Level 2 complete (900 SF). Level 3 entry assessment done.','Clear','',5],
    ['dl10','p2','2026-02-25','Oscar,Crew x3',32,'Level 3 containment setup. VCT removal Level 3 started — 600 SF of 1800 SF.','Overcast','',4],
    ['dl1','p1','2026-03-03','Oscar,Crew x4',40,'Site mobilization. Decon unit installed at south entrance. Full perimeter containment erected.','Overcast','',8],
    ['dl2','p1','2026-03-04','Oscar,Crew x4',40,'VCT floor tile removal Level 1 complete — 2500 SF. Waste staged.','Clear','',12],
    ['dl3','p1','2026-03-05','Oscar,Crew x3',32,'Ceiling tile removal Level 1 — 1200 SF. HEPA-vacuumed.','Rain','HEPA Vac unit #2 motor failure at 9:30 AM. Sunbelt delivered replacement by 11:45 AM. No schedule impact.',7],
  ]
  spreadsheet.getSheetByName('DailyLogs').getRange(2,1,logs.length,logs[0].length).setValues(logs)

  // ── Seed: Costs
  const costs = [
    ['cost6','p2','2026-02-17','Oscar — Week 1 (5 days)',4200,'labour','Oscar Morales'],
    ['cost7','p2','2026-02-17','Crew x3 — Week 1 (5 days)',10800,'labour','24/7 Workforce'],
    ['cost8','p2','2026-02-17','Decon unit rental (4 weeks)',3200,'equipment','Sunbelt Rentals'],
    ['cost9','p2','2026-02-18','HEPA vacuums x2 rental (4 wks)',2400,'equipment','Sunbelt Rentals'],
    ['cost10','p2','2026-02-19','Abatement bags, poly, PPE',2200,'materials','SafeGuard Supply'],
    ['cost11','p2','2026-02-19','Air quality testing — Level 1',1400,'subcontractor','EcoTest Environmental'],
    ['cost12','p2','2026-02-20','Waste disposal — Load 1 (2 bins)',1850,'subcontractor','CleanHaul BC'],
    ['cost13','p2','2026-02-23','Mastic grinding — Level 1 sub',2800,'subcontractor','FloorPro BC'],
    ['cost14','p2','2026-02-23','Oscar — Week 2 (3 days)',2520,'labour','Oscar Morales'],
    ['cost15','p2','2026-02-23','Crew x3-4 — Week 2 (3 days)',8640,'labour','24/7 Workforce'],
    ['cost16','p2','2026-02-24','Air quality testing — Level 2',1400,'subcontractor','EcoTest Environmental'],
    ['cost1','p1','2026-03-03','Oscar — 3 days labour',2520,'labour','Oscar Morales'],
    ['cost2','p1','2026-03-03','Crew x4 — 3 days',10800,'labour','24/7 Workforce'],
    ['cost3','p1','2026-03-03','HEPA Vac x2 rental',1200,'equipment','Sunbelt Rentals'],
    ['cost4','p1','2026-03-03','Decon unit rental',1800,'equipment','Sunbelt Rentals'],
    ['cost5','p1','2026-03-04','Abatement supplies',3400,'materials','SafeGuard Supply'],
    ['costp1_6','p1','2026-03-05','Waste disposal — Load 1',1850,'subcontractor','CleanHaul BC'],
  ]
  spreadsheet.getSheetByName('Costs').getRange(2,1,costs.length,costs[0].length).setValues(costs)

  // ── Seed: Invoices
  const invoices = [
    ['inv2','p2','2602001','progress',97500,10,'2026-02-25','','','Progress billing — 50% completion. Levels 1 & 2 fully abated and air-cleared.'],
  ]
  spreadsheet.getSheetByName('Invoices').getRange(2,1,invoices.length,invoices[0].length).setValues(invoices)

  Logger.log('West Crow Dashboard setup complete! All tabs created and seeded.')
}
