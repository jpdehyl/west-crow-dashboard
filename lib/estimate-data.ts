// Default estimate sections matching JP's DeHyl/West Crow template
// Phase codes from DeHyl PBS system

export interface LineItem {
  id: string
  phase_code: string
  description: string
  unit_type: string
  units: number
  units_per_day: number   // production rate (user fills this in)
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
  cost_per_man_day: number   // default $296
  material_pct:     number   // default 18
  overhead_pct:     number   // default 12
  profit_pct:       number   // default 30
}

export const DEFAULT_CONFIG: EstimateConfig = {
  cost_per_man_day: 296,
  material_pct: 18,
  overhead_pct: 12,
  profit_pct: 30,
}

function item(id: string, phase_code: string, description: string, unit_type: string, units_per_day = 1): LineItem {
  return { id, phase_code, description, unit_type, units: 0, units_per_day, active: true, notes: "" }
}

export const DEFAULT_SECTIONS: Section[] = [
  {
    id: "vft_mastic",
    name: "VFT + Mastic",
    expanded: true,
    items: [
      item("vft-mob",   "010001", "Mobilization",          "EA",  1),
      item("vft-rem",   "010120", "VFT Removal",           "SF",  250),
      item("vft-mastic","010198", "Mastic Removal / Grind","SF",  150),
      item("vft-waste", "010330", "Waste Handling",        "EA",  1),
      item("vft-clean", "010197", "Cleaning / HEPA Vac",   "EA",  1),
      item("vft-demob", "010315", "Demobilization",        "EA",  7),
    ],
  },
  {
    id: "acm_ceiling",
    name: "Asbestos — Ceiling Tile",
    expanded: false,
    items: [
      item("acm-mob",    "010001", "Mobilization",              "EA",  1),
      item("acm-decon",  "010110", "Decon Unit Setup",          "EA",  1),
      item("acm-enc",    "020100", "Containment / Enclosure",   "SF",  500),
      item("acm-rem",    "010198", "ACM Ceiling Tile Removal",  "SF",  200),
      item("acm-waste",  "010330", "Waste Handling & Disposal", "EA",  1),
      item("acm-clear",  "010197", "Air Clearance / Cleaning",  "EA",  1),
      item("acm-demob",  "010315", "Demobilization",            "EA",  7),
    ],
  },
  {
    id: "acm_pipe",
    name: "Asbestos — Pipe Insulation",
    expanded: false,
    items: [
      item("pipe-mob",   "010001", "Mobilization",              "EA",  1),
      item("pipe-decon", "010110", "Decon Unit Setup",          "EA",  1),
      item("pipe-enc",   "020100", "Containment / Enclosure",   "LF",  200),
      item("pipe-rem",   "010198", "Pipe Insulation Removal",   "LF",  50),
      item("pipe-waste", "010330", "Waste Handling & Disposal", "EA",  1),
      item("pipe-clear", "010197", "Air Clearance / Cleaning",  "EA",  1),
      item("pipe-demob", "010315", "Demobilization",            "EA",  7),
    ],
  },
  {
    id: "lead",
    name: "Lead",
    expanded: false,
    items: [
      item("lead-mob",   "010001", "Mobilization",              "EA",  1),
      item("lead-decon", "010110", "Decon Unit Setup",          "EA",  1),
      item("lead-enc",   "020100", "Containment / Enclosure",   "SF",  400),
      item("lead-rem",   "010198", "Lead Paint / Component Removal", "SF", 80),
      item("lead-waste", "010330", "Waste Handling & Disposal", "EA",  1),
      item("lead-clear", "010197", "Air Clearance / Cleaning",  "EA",  1),
      item("lead-demob", "010315", "Demobilization",            "EA",  7),
    ],
  },
  {
    id: "demo_structural",
    name: "Demo — Structural",
    expanded: false,
    items: [
      item("demo-mob",   "010001", "Mobilization",              "EA",  1),
      item("demo-walls", "010193", "Wall Demo",                 "SF",  400),
      item("demo-ceil",  "010193", "Ceiling Demo",              "SF",  350),
      item("demo-floor", "010193", "Floor / Slab",              "SF",  300),
      item("demo-waste", "010330", "Waste Handling",            "EA",  1),
      item("demo-tear",  "015100", "Tear Out / Haul Away",      "EA",  1),
      item("demo-demob", "010315", "Demobilization",            "EA",  7),
    ],
  },
  {
    id: "washroom",
    name: "Washroom",
    expanded: false,
    items: [
      item("wash-mob",   "010001", "Mobilization",              "EA",  1),
      item("wash-fix",   "010198", "Fixtures / Vanity Removal", "EA",  10),
      item("wash-tile",  "010198", "Tile Removal",              "SF",  150),
      item("wash-waste", "010330", "Waste Handling",            "EA",  1),
      item("wash-tear",  "015100", "Tear Out",                  "EA",  1),
      item("wash-demob", "010315", "Demobilization",            "EA",  7),
    ],
  },
  {
    id: "flooring",
    name: "Flooring",
    expanded: false,
    items: [
      item("floor-mob",   "010001", "Mobilization",             "EA",  1),
      item("floor-rem",   "010198", "Flooring Removal",         "SF",  400),
      item("floor-waste", "010330", "Waste Handling",           "EA",  1),
      item("floor-tear",  "015100", "Tear Out",                 "EA",  1),
      item("floor-demob", "010315", "Demobilization",           "EA",  7),
    ],
  },
  {
    id: "drywall",
    name: "Drywall",
    expanded: false,
    items: [
      item("dry-mob",   "010001", "Mobilization",               "EA",  1),
      item("dry-enc",   "020100", "Enclosure (if needed)",      "SF",  500),
      item("dry-rem",   "010193", "Drywall Removal",            "SF",  300),
      item("dry-waste", "010330", "Waste Handling",             "EA",  1),
      item("dry-tear",  "015100", "Tear Out",                   "EA",  1),
      item("dry-demob", "010315", "Demobilization",             "EA",  7),
    ],
  },
  {
    id: "roof",
    name: "Roof",
    expanded: false,
    items: [
      item("roof-mob",   "010001", "Mobilization",              "EA",  1),
      item("roof-decon", "010110", "Decon (if ACM present)",    "EA",  1),
      item("roof-rem",   "010120", "Roofing Removal",           "SF",  300),
      item("roof-waste", "010330", "Waste Handling",            "EA",  1),
      item("roof-demob", "010315", "Demobilization",            "EA",  7),
    ],
  },
  {
    id: "others",
    name: "Others / Misc",
    expanded: false,
    items: [
      item("oth-mob",    "010001", "Mobilization",              "EA",  1),
      item("oth-lights", "010198", "Light Fixtures Removal",    "EA",  30),
      item("oth-plumb",  "010198", "Plumbing Fixtures",         "EA",  10),
      item("oth-smoke",  "010198", "Smoke Detectors",           "EA",  30),
      item("oth-chems",  "010198", "Chemical / Hazmat Removal", "EA",  5),
      item("oth-mill",   "010198", "Millwork Remove & Dispose", "SF",  100),
      item("oth-demob",  "010315", "Demobilization",            "EA",  7),
    ],
  },
]
