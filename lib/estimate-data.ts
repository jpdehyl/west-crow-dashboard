// Default estimate sections matching JP's DeHyl/West Crow template
// Phase codes from DeHyl PBS system
// ⚠️ Clark's rule: Mob (010001) and Demob (010315) have NO material cost
// ⚠️ Waste Handling: qty = ~15% of removal SF, 140 units/day
// ⚠️ Subtrades section: separate 20% markup (NOT DeHyl formula)

export interface LineItem {
  id: string
  phase_code: string
  description: string
  unit_type: string
  units: number
  units_per_day: number   // production rate
  has_material: boolean   // ← false for Mob/Demob (010001 / 010315)
  active: boolean
  notes: string
}

export interface SubtradeItem {
  id: string
  phase_code: string
  description: string
  unit_type: string
  units: number
  unit_cost: number       // flat rate per unit (not formula-based)
  active: boolean
  notes: string
}

export interface Section {
  id: string
  name: string
  expanded: boolean
  items: LineItem[]
}

export interface EstimateConfig {
  cost_per_man_day: number   // default $296 (verified from 2601004 PBS)
  material_pct:     number   // default 18% (work activities only — NOT Mob/Demob)
  overhead_pct:     number   // default 12% (additive)
  profit_pct:       number   // default 30% (additive)
  subtrade_markup:  number   // default 20% (separate from DeHyl margin)
}

export const DEFAULT_CONFIG: EstimateConfig = {
  cost_per_man_day: 296,
  material_pct: 18,
  overhead_pct: 12,
  profit_pct: 30,
  subtrade_markup: 20,
}

// ── Line item factory ──────────────────────────────────────────────────────
// has_material defaults to true for work items, false for Mob/Demob
function item(
  id: string,
  phase_code: string,
  description: string,
  unit_type: string,
  units_per_day = 1,
  has_material = true,
): LineItem {
  return { id, phase_code, description, unit_type, units: 0, units_per_day, has_material, active: true, notes: "" }
}

// Mob / Demob helpers (no material)
const mob  = (id: string) => item(id, "010001", "Mobilization",    "EA", 1,   false)
const demob= (id: string) => item(id, "010315", "Demobilization",  "EA", 7,   false)
// Waste Handling: ~15% of removal qty, 140 units/day
const waste= (id: string, desc = "Waste Handling & Disposal") =>
  item(id, "010330", desc, "EA", 140, true)

export const DEFAULT_SECTIONS: Section[] = [
  {
    id: "vft_mastic",
    name: "VFT + Mastic (Floor Tile)",
    expanded: true,
    items: [
      mob("vft-mob"),
      item("vft-rem",    "010120", "VFT Removal (ACM tile)",         "SF",  250),  // verified 2601004
      item("vft-mastic", "010198", "Mastic Removal / Grind",         "SF",  150),
      waste("vft-waste", "Waste Handling (~15% of tile SF, 140/day)"),
      item("vft-clean",  "010197", "Cleaning / HEPA Vac",            "EA",  1),
      demob("vft-demob"),
    ],
  },
  {
    id: "acm_ceiling",
    name: "Asbestos — Ceiling Tile",
    expanded: false,
    items: [
      mob("acm-mob"),
      item("acm-decon",  "010110", "Decon Unit Setup",               "EA",  1),
      item("acm-enc",    "020100", "Containment / Enclosure",        "SF",  500),
      item("acm-rem",    "010100", "ACM Ceiling Tile Removal",       "SF",  200),
      waste("acm-waste"),
      item("acm-clear",  "010197", "Air Clearance / Cleaning",       "EA",  1),
      demob("acm-demob"),
    ],
  },
  {
    id: "acm_drywall",
    name: "Asbestos — Drywall / Texture",
    expanded: false,
    items: [
      mob("dry-mob"),
      item("dry-decon",  "010110", "Decon Unit Setup",               "EA",  1),
      item("dry-enc",    "020100", "Containment / Enclosure",        "SF",  500),
      item("dry-rem",    "010115", "Drywall Removal (ACM)",          "SF",  300),
      waste("dry-waste"),
      item("dry-clear",  "010197", "Air Clearance / Cleaning",       "EA",  1),
      demob("dry-demob"),
    ],
  },
  {
    id: "acm_pipe",
    name: "Asbestos — Pipe Insulation",
    expanded: false,
    items: [
      mob("pipe-mob"),
      item("pipe-decon", "010110", "Decon Unit Setup",               "EA",  1),
      item("pipe-enc",   "020100", "Containment / Enclosure",        "LF",  200),
      item("pipe-rem",   "010198", "Pipe Insulation Removal",        "LF",  50),
      waste("pipe-waste"),
      item("pipe-clear", "010197", "Air Clearance / Cleaning",       "EA",  1),
      demob("pipe-demob"),
    ],
  },
  {
    id: "acm_vermiculite",
    name: "Asbestos — Vermiculite (High Risk)",
    expanded: false,
    items: [
      mob("verm-mob"),
      item("verm-decon", "010110", "Decon Unit Setup",               "EA",  1),
      item("verm-enc",   "020100", "Containment / Enclosure",        "SF",  400),
      item("verm-rem",   "010145", "Vermiculite / High Risk Removal","SF",  50),
      waste("verm-waste"),
      item("verm-clear", "010197", "Air Clearance / Cleaning",       "EA",  1),
      demob("verm-demob"),
    ],
  },
  {
    id: "lead",
    name: "Lead",
    expanded: false,
    items: [
      mob("lead-mob"),
      item("lead-decon", "010110", "Decon Unit Setup",               "EA",  1),
      item("lead-enc",   "020100", "Containment / Enclosure",        "SF",  400),
      item("lead-rem",   "010198", "Lead Paint / Component Removal", "SF",  80),
      waste("lead-waste"),
      item("lead-clear", "010197", "Air Clearance / Cleaning",       "EA",  1),
      demob("lead-demob"),
    ],
  },
  {
    id: "demo_structural",
    name: "Demo — Structural / Tear Out",
    expanded: false,
    items: [
      mob("demo-mob"),
      item("demo-walls", "010115", "Partition Wall Demo (drywall)",  "SF",  400),
      item("demo-ceil",  "010115", "Ceiling Demo",                   "SF",  350),
      item("demo-floor", "010193", "Floor / Slab",                   "SF",  300),
      item("demo-millw", "052810", "Millwork Remove & Dispose",      "SF",  100),
      item("demo-fixts", "010198", "Fixtures (sinks, toilets, EA)",  "EA",  10),
      waste("demo-waste", "Waste Handling"),
      item("demo-tear",  "015100", "Tear Out / Haul Away",           "EA",  1),
      demob("demo-demob"),
    ],
  },
  {
    id: "washroom",
    name: "Washroom",
    expanded: false,
    items: [
      mob("wash-mob"),
      item("wash-fix",   "010198", "Fixtures / Vanity Removal",      "EA",  10),
      item("wash-tile",  "010198", "Ceramic Tile Removal",           "SF",  150),
      item("wash-wall",  "010115", "Drywall Removal",                "SF",  300),
      waste("wash-waste"),
      item("wash-tear",  "015100", "Tear Out",                       "EA",  1),
      demob("wash-demob"),
    ],
  },
  {
    id: "flooring",
    name: "Flooring (Clean)",
    expanded: false,
    items: [
      mob("floor-mob"),
      item("floor-rem",   "010198", "Flooring Removal",              "SF",  400),
      waste("floor-waste"),
      item("floor-tear",  "015100", "Tear Out",                      "EA",  1),
      demob("floor-demob"),
    ],
  },
  {
    id: "roof",
    name: "Roof",
    expanded: false,
    items: [
      mob("roof-mob"),
      item("roof-decon", "010110", "Decon (if ACM present)",         "EA",  1),
      item("roof-rem",   "010120", "Roofing Removal",                "SF",  300),
      waste("roof-waste"),
      demob("roof-demob"),
    ],
  },
  {
    id: "others",
    name: "Others / Misc",
    expanded: false,
    items: [
      mob("oth-mob"),
      item("oth-lights", "010198", "Light Fixtures Removal",         "EA",  30),
      item("oth-plumb",  "010198", "Plumbing Fixtures",              "EA",  10),
      item("oth-smoke",  "010198", "Smoke Detectors",                "EA",  30),
      item("oth-chems",  "010198", "Chemical / Hazmat Removal",      "EA",  5),
      item("oth-safe",   "010198", "Concrete Safe / Heavy Item",     "EA",  2),
      waste("oth-waste", "Waste Handling"),
      demob("oth-demob"),
    ],
  },
]

// ── Default Subtrades ──────────────────────────────────────────────────────
// Priced at flat rate, then × 1.20 (20% subtrade markup)
// NOT the same as DeHyl's OH+Profit on own labour

function sub(
  id: string,
  phase_code: string,
  description: string,
  unit_type: string,
  unit_cost: number,
): SubtradeItem {
  return { id, phase_code, description, unit_type, units: 0, unit_cost, active: true, notes: "" }
}

export const DEFAULT_SUBTRADES: SubtradeItem[] = [
  sub("sub-air",     "000000", "Air Monitoring (Kinetic Asbestos / 3rd party)",  "LS",  850),
  sub("sub-disposal","057050", "ACM Waste Disposal (bins + haul)",               "LS",  2800),
  sub("sub-truck",   "051030", "Pickup Truck",                                   "/day", 90),
  sub("sub-tools",   "057050", "Small Tools / Shop Consumables",                 "/day", 1.81),
  sub("sub-pm",      "056400", "Project Manager Oversight",                      "EA",  95),
  sub("sub-haul",    "057050", "Waste Transport / Haul-out",                     "LS",  450),
  sub("sub-grinder", "054600", "Grinder / Floor Prep Equipment",                 "EA",  450),
  sub("sub-loa",     "018200", "Living Out Allowance (LOA)",                     "/day", 75),
  sub("sub-hotel",   "018250", "Hotel / Meals",                                  "LS",  0),
  sub("sub-gas",     "018300", "Gas & Ferries",                                  "LS",  0),
]
