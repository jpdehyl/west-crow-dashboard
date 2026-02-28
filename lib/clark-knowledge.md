# CLARK_WESTCROW.md — West Crow Contracting: Clark's Estimating Knowledge Base

> Deep study of 21 completed bids + pricing template | Feb 27, 2026
> Source: Dropbox `/West Crow Estimators/` — 280+ bids accessible

---

## The West Crow Way

West Crow does interior and exterior commercial demolition/renovation work across Greater Vancouver. Their clients are GCs, property managers, universities, retail chains, banks, hospitals, and government. The work is clean, professional, and they position themselves as a premium sub-trade — not the cheapest, but reliable and thorough.

**The estimating philosophy:**
- Unit prices are set in the Estimating sheet. Clark does NOT invent prices — use the database.
- Scope comes from drawings + hazmat reports + the scope letter. If any of these are missing, flag it.
- Labour drives the budget. Get the quantities right and the labour days fall out from the unit rates.
- The markup is a business decision (11–25%). Clark always flags what it used and why.
- Every estimate is a DRAFT until JP approves. Clark flags assumptions clearly.
- When in doubt, be conservative — better to win at 20% than lose at 30%.

---

## The Excel Sheet (7 Tabs)

Every West Crow estimate uses `Demo Quote Sheet - Template 2024.xlsx`:

| Tab | Purpose |
|-----|---------|
| **Project Cost** | THE ESTIMATE — all line items, labour, equipment, totals |
| **Costing** | Internal actual cost tracking (crew wages, supply costs) |
| **PO Tracking** | Purchase orders issued |
| **Estimating** | Unit price database + scope quantities (Clark's primary tool) |
| **Project Hand off** | Site handoff checklist for foreman |
| **Database** | Historical data reference |
| **Grinding Process** | Grinding/scarifying workflow |

---

## Dropbox Folder Structure

Every bid in `/West Crow Estimators/[Project Name]/` follows:
```
├── Bid Documents/
│   ├── Addenda/
│   └── [Scope letter / IFT package].pdf
├── Drawings/
│   └── [Drawing set]/
│       ├── Drawing-Packages_Combined/   ← full PDF set
│       └── Drawing-Packages_Individual/ ← arch / mech / elec separately
├── Hazmat/                              ← hazmat survey reports
├── Site Documents/
├── Site Pics/
└── Takeoff - Virtual Estimator/         ← CLARK'S OUTPUT GOES HERE
    ├── Demo Quote [Project Name].xlsx   ← filled estimate
    └── [Marked-up takeoff PDFs]         ← annotated drawings showing quantities
```

---

## Unit Price Database (Estimating Sheet, Col C = Standard Price)

### Interior Scope Items

| Item | Unit | Std Price | Range | Notes |
|------|------|-----------|-------|-------|
| T-Bar ceiling | sf | $1.00 | $0.60–$2.00 | $2 if scissor lift required (>8'6" or tight access) |
| Drywall ceiling (standard) | sf | $3.50 | $3.50–$5.00 | Up to 8ft; $4–5 if over 10ft |
| Complicated drywall ceiling | sf | $5.00 | $2.50–$4.00 | Many lights, diffusers, complex layout |
| Bulkhead | sf/lf | $10.00 | — | Can be sf or lf depending on shape |
| Standard partition wall demo (studs incl.) | lf | $25.00 | $25–$35 | Up to 9ft H; $30–35 up to Q-Deck; includes drywall both sides + studs |
| Lath & plaster wall | lf | $30.00 | — | Old buildings; heavier, more labour |
| Single sided drywall removal | lf | $15.00 | $10–$20 | Perimeter walls; drywall + insulation only, no studs |
| Wall finishes (ceramic tile/wood/panels) | lf | varies | — | Price per material type |
| Pony wall demo (studs incl.) | lf | ~$25 | — | Short walls, same logic as standard partition |
| Carpet tile/rolled carpet | sf | $1.00 | $1.00–$1.50 | Rolled $1–1.50/sf |
| Vinyl tile/sheet | sf | $2.50 | — | Standard VCT, sheet vinyl |
| Laminate | sf | $2.00 | — | Click-together laminate |
| Ceramic tile | sf | $4.00 | $3–$4 | Wall or floor tile |
| Glued down engineered wood | sf | $4.00 | $4–$6 | With floor scraper; add for concrete residue |
| Tile with floor scraper | sf | $3.00–$5.00 | — | Tile removal using scraper machine |
| Glued down wood with floor scraper | sf | $5.00–$6.00 | — | Dense adhesive; more time |
| Millwork (simple) | lf | $5–$10 | — | Basic shelving, closet systems |
| Millwork (kitchen – full) | lf | $25.00 | $25–$35 | All cabinetry, sink, faucet, garburator, appliances, counters |
| Metal shelving | lf | $15.00 | $5–$15 | Standard $15/lf |
| Blinds removal | lf | $5.00 | — | Per lf of blind |
| Single door (incl. frame) | each | $50.00 | — | Standard interior door |
| Double door (incl. frame) | each | $60.00 | — | Pair of doors |
| Handrail | lf | $5–$10 | — | Wall-mounted or post; price based on complexity |
| Complicated storefront | lf | $60.00 | $50–$100 | Includes doors, glazing, security fencing, bulkheads |
| Office washrooms | sf | $20.00 | — | Wall-to-wall tile, T-bar, stalls, large vanity, all fixtures, millwork, shower, mirror, accessories |
| Full gut – Apt (under 900 sf) | lump | $12,000–$14,000 | — | Everything to concrete shell |
| Full gut – Apt (1000 sf+) | lump | $18,000–$20,000 | — | — |
| Full gut – Vancouver small house | lump | $24,000–$26,000 | — | — |
| Drywall Asbestos bags (>2000 sf) | lump | see note | — | Hazmat disposal surcharge when drywall taping compound is asbestos-positive |

### Exterior Scope Items

| Item | Unit | Std Price | Notes |
|------|------|-----------|-------|
| Stucco | sf | $3.50 | Without plywood sheathing |
| Cladding/siding | sf | $2.50 | — |
| Brick veneer | sf | $2.50 | — |
| Wood siding | sf | $2.50 | — |
| Single sided plywood – wall | sf | $2.50 | — |
| Built-up roof membrane 4-ply, gravel | sf | $5.00 | — |
| Built-up roof membrane 4-ply, smooth | sf | $4.00 | — |
| Metal soffit and fascia | sf | $1.50 | — |
| Wood deck and staircase | sf | $8.00 | — |
| Plywood sheathing – roof/deck | sf | $2.50 | — |
| Asphalt/wood shingle | sf | $3.50 | — |
| Fence | lf | $5.00 | — |
| Skylight | each | $300.00 | Depends on size — flag if unusual |
| Concrete – 1" thick | sf | $3.50 | Topping slab removal |

---

## Labour Rates (Retail — What Client Pays)

These are the rates entered into the Project Cost sheet:

| Role | Retail Rate (Col G/I) |
|------|-----------------------|
| Foreman | $68–$70/hr |
| Labourer | $58–$60/hr |
| Overtime – Foreman | (add OT line when applicable) |
| Abatement tech | $40–$46/hr (row 101–110 Abatement section) |

**Crew rule of thumb:**
- Standard TI demo crew = 1 Foreman + 2–3 Labourers
- Small residential/condo = 1 Foreman + 1 Labourer
- Large commercial = 1 Foreman + 3–4 Labourers + possible 2nd Foreman for multi-floor

**Production rates** (days per quantity — use for estimating labour days):
- T-bar ceiling: ~800–1,000 sf/day per crew member
- Drywall ceiling: ~400–600 sf/day per crew
- Standard partition wall: ~100–150 lf/day per crew
- Single sided drywall: ~200–300 lf/day per crew
- Vinyl tile (floor scraper): ~500–800 sf/day
- Carpet removal: ~800–1,200 sf/day
- Engineered wood (glued): ~300–500 sf/day

---

## Cost Sections (Project Cost Sheet)

### 1. Equipment (Consumables)
Standard consumables WC stocks and charges per job:

| Item | Unit Cost |
|------|-----------|
| Ramboard (floor protection) | $65.00 |
| Poly (100' roll) | $53.50 |
| Foam | $14.98/each |
| Tape | $9.63/each |
| Shark bites (water line caps) | $6.42/each |
| Brass caps | $0.54/each |
| Tack mat | $25.00/each |
| Zippers | $13.38/each |
| Hepa-Vac | $35.00/day |
| Negative air | $35.00/day |
| Negative air ducting | $0.50/ft |
| Carpet shield | $46.76/each |
| Hepa vac bag | $4.50/each |
| Vacuum bags/filters | $26.75 |
| Tyvek suit | $7.00/each |
| Respirator filter | $6.00/each |
| Asbestos bags | $1.26/each |

### 2. Rental Equipment

| Item | Cost |
|------|------|
| Jackhammer (WCC) | $75.00/day |
| Stucco saw | market rate/day |
| Baker scaffolding | /week (varies) |

### 3. Mobilization (Mob's)
| Item | Standard Retail |
|------|----------------|
| Mob – Tools and crew | **$250 flat** (standard for most jobs) |
| Mob – Flooring machine | Add when flooring scraper needed |
| Mob – Rental gear | Add when picking up major rentals |

### 4. Labour
Fill in days × retail rate. Standard starting crew = 1 Foreman + labourers based on scope.

### 5. Trucking & Bins
| Item | Retail Price |
|------|-------------|
| GWB bin 18Yd (~2.5 ton) | $720–$927 |
| Mixed bin | $720 |
| Large/heavy bin | $800+ |
| Dump truck (extra) | varies |
| Truck surecharge (up to 1 hr) | $250 |

**Bin count rule:** 
- 1 GWB bin = ~2.5 tons = ~250–300 sf of drywall (1 side)
- Mixed demo bin = varies; 1 bin per ~500–800 sf of general TI demo
- When in doubt, add one extra bin — underbidding bins kills margin

### 6. Dump Fees
Separate from bin rental (these are tipping fees):
- Garbage
- Concrete (recycled)
- Drywall (GWB recycled)

### 7. Site Costs
- Site trailer (if needed)
- Security
- Washrooms/Signage/Etc
- Also: Hepa-Vac at $2,705 (item ID 498) for large abatement jobs

### 8. Abatement Section (rows 99–120)
Separate labour section for certified abatement work (asbestos, lead):
- Abatement tech rates: $20–$46/hr cost; $39–$113/hr retail depending on type
- SF/bags tracked separately
- If project has confirmed hazmat, this section is activated

### 9. Travel / LOA
- Live Out Allowance (nights): $633.60/night
- Mileage tracked separately

### 10. Safety
- CSO on Site: $450/day
- Add when project requires site safety officer

### 11. Sub-Contractors
- Concrete cutting: $1,500 (standard line; add when saw cutting required)
- Other subs: line item with cost and markup

### 12. Other / Supplies
- General supplies: 5% of sub-total (automatically calculated in row 141)
- Can also be line items for special equipment

---

## The Markup Logic

After all cost sections sum to a Sub-Total, the sheet adds **5% for supplies/tools** to get the Total Cost. Then it shows a markup table with options:

| Markup % | Bid Price multiplier |
|----------|---------------------|
| 11% | Cost × 1.11 |
| 12% | Cost × 1.12 |
| 15% | Cost × 1.15 |
| 18% | Cost × 1.18 |
| 20% | Cost × 1.20 |
| 23% | Cost × 1.23 |
| 25% | Cost × 1.25 |

**Clark always uses 20% markup as default** and flags it. JP adjusts up or down based on:
- How competitive is this bid?
- Is this a repeat client? (sharpen)
- Complex access or scheduling risk? (pad)
- First shot at a new client? (sharpen)
- Hazmat confirmed? (pad)

---

## Reading a Scope Package

### What to look for in drawings:
1. **Demo plans** — usually titled "Demo Plan" or "Existing Plan". Shows what gets removed (hatching, dashed lines, demo clouds).
2. **Reflected ceiling plan (RCP)** — shows ceiling type (T-bar, drywall, bulkhead heights)
3. **Floor finish schedule** — legend showing floor types per room
4. **Wall schedule** — partition types and heights
5. **Door schedule** — count and type of doors to demo
6. **Sections/Details** — reveals ceiling heights, wall constructions

### What to look for in the scope letter / IFT:
- Demolition scope section (often "Division 02 – Demolition")
- Spec notes for specific materials: "remove and dispose all existing VCT flooring"
- Salvage instructions: "contractor to carefully remove existing millwork for owner reuse"
- HAZMAT references: "all work subject to pre-construction hazmat survey"
- Phasing: "work to be done in 2 phases — Phase 1: floors 2&3, Phase 2: floor 1"
- Building occupied: "building occupied; work restricted to 7pm–7am"

### What to look for in the hazmat report:
- **Positive findings**: asbestos in floor tile (VCT), drywall taping compound, pipe insulation, spray fireproofing (Monokote), vermiculite insulation, popcorn/acoustic ceiling
- **Lead**: lead paint on walls, window sills, radiators
- **Leachability note**: if lead is present, need TCLP test before disposal
- **Quantity estimates** in the hazmat report — use these for abatement pricing

---

## Scope Item Frequency (from 21 completed bids)

Most common items across all West Crow TI jobs:
1. Single sided drywall removal — appears in ~90% of bids
2. Vinyl tile / sheet flooring removal — ~80%
3. Glued down engineered wood flooring — ~70%
4. Lath & plaster wall removal — ~50% (older buildings)
5. Standard partition wall demo — ~60%
6. T-bar ceiling removal — ~50%
7. Carpet removal — ~40%
8. Millwork removal — ~45%
9. Complicated storefront — ~20%
10. Ceramic tile — ~35%

**Most common scope NOTE text found:**
- "NO HAZMAT REPORT" — flag; add assumption that hazmat required
- "ASSUMED T-BAR CEILING TO BE REMOVED" — Clark must flag when making ceiling assumptions
- "WALLS UP TO Q-DECK (HEIGHT: 26'7")" — triggers $30–35/lf wall rate, not $25
- "HAZMAT: DRYWALL TAPING COMPOUND CONTAINS ASBESTOS" — triggers abatement section

---

## Hazmat Handling

### When a hazmat report is provided and positive:
1. Identify the hazmat materials: type, location, quantity (sf/lf)
2. Activate the Abatement section in Project Cost sheet
3. **Labour = regular WCC crew at STANDARD rates** — $68–70/hr foreman + $58–60/hr labourer
   ⚠️ Do NOT use premium abatement tech rates. WCC self-performs with their own crew.
   The Abatement section in the sheet is for MATERIALS and EQUIPMENT ONLY — not labour.
4. Add abatement materials to the Abatement section: Tyvek suits, P100 filters, poly, bags, tape, HEPA vac, buckets — budget ~$250–300 total
5. Add Negative Air Machine if asbestos ($35/day × job days). Lead work = HEPA vac only, no negative air needed.
6. Add disposal costs for asbestos/lead bags
7. Include: "Positive results for Lead require a Leachability test (TCLP) for proper disposal"

**Lead tile production rate:** ~200–300 sf/crew-day (wet method, slower)
- 260 sf of lead tile = 1 crew-day (1 foreman + 1 labourer)
- Lead jobs typically bid at 11% markup — Dave prices thin to stay competitive

### When NO hazmat report is provided:
Always include ALL of these assumptions:
> "Based on the year built (___), a hazmat report is required prior to job start."
> "All pricing to be confirmed when pre-construction Hazmat survey has been provided."
> "Price is set as clean (non-lead/asbestos-containing materials)."

### Asbestos drywall taping compound (very common in pre-1980 buildings):
- Most common positive finding in Vancouver commercial
- Adds drywall asbestos disposal bags + abatement protocol
- Flag: "HAZMAT: Drywall taping compound confirmed/assumed to contain asbestos."

---

## Standard Qualifications (Always Include)

Every West Crow estimate includes these in the scope notes section. Clark must include ALL applicable ones:

**Operational:**
- "Prices are set for a single-phase project."
- "Work during regular hours, 8am–5pm. Any work stoppages due to noise during these hours will be billed T&M, $75/hr/person."
- "Any furniture or personal belongings in the way of work will be moved by others."
- "West Crow enclosed trailer on site can be used to store abatement waste."
- "3 units/day and up to 6/week" (production rate note when applicable)

**Hazmat (always include when no confirmed clean report):**
- "Lead-containing materials are not leachable."
- "Insulation, if any, is batt and not blown in or vermiculite."
- "All pricing to be confirmed when pre-construction Hazmat survey has been provided."
- "Positive results for Lead require a Leachability test (TCLP) for proper disposal."

**GC Responsibilities:**
- "GC will supply scaffolding/boom lifts/suspended stages and garbage chutes for the exterior demolition."
- "GC will set up/move/tear down the scaffolding."
- "GC will provide a leachability test for lead-containing materials prior to job start."
- "GC will provide/install scaffold/boom lift/scissor lift and garbage chute for exterior demolition."
- "GC will provide/install/tear down a shrink-wrap containment if the project requires."

**Paperwork:**
- "Any additional paperwork such as criminal records will be an extra charge."

---

## Multi-Scope and Multi-Phase Logic

When a bid has multiple areas or phases:

1. **Estimate each scope area separately** in the Estimating sheet (use the U/description column to label each area, e.g., "LEVEL 2 OFFICE D2325", "LEVEL 4 FAITH ROOM")
2. **Sum quantities per material type** across all areas for the Project Cost sheet entries
3. **Label phases in scope notes**: "Phase 1: Floors 2–3 | Phase 2: Floor 1"
4. **Separate the bin schedule**: more areas = more trips = more bins
5. **Add a mobilization per phase** if phases are separated by time (>1 week apart)
6. **Flag multi-phase explicitly**: "Price is set as single-phase. If phased over multiple periods, remobilization charges apply."

---

## Blind Test Scorecard (Clark vs Actual)

> Every time Clark is tested against a real completed bid, log it here. This is Clark's report card.
> Target: ±2–5% variance on final bid price.

| # | Project | Clark Bid | Actual | Variance | Status | Root Cause / Lesson |
|---|---------|-----------|--------|----------|--------|---------------------|
| 1 | CFIA Gender-Neutral Washroom | $4,706 | $4,716 | **-0.2%** | ✅ | 6 calibration rules derived (see below) |
| 2 | Richardson International NV | ~$3,019 | $2,511 | **+20.2%** | ⚠️ Fixed | Used specialist abatement rates instead of standard WCC crew rates — corrected in Hazmat Handling + Calibration Rule #7 |
| 3 | Crossroads Law Expansion (999 W Hastings) | $2,264 | $2,300 | **-1.6%** | ✅ | At 15% markup. Clean TI, simple scope. Dead accurate. |
| 4 | Emily Carr University (2021 selective demo) | $504 | $1,900 | **-73%** | ⚠️ Fixed | Scope quantities were tiny (30SF T-bar, 10LF blinds) but WCC applied minimum job floor. Calibration Rule #8 added. |

**Running average (Tests 1–4):** Tests 1 & 3 nailed it. Tests 2 & 4 revealed critical rules now fixed. | Target: ±5%

---

## Calibration Rules (Learned from Blind Tests)

These corrections were derived by running Clark blind on a real completed bid and comparing line by line.

### 1. Labour Scaling by Building Type
Base estimate is for **vacant, open-access commercial space**. Apply multipliers:

| Condition | Labour Multiplier |
|-----------|-------------------|
| Vacant, open access (default) | 1.0× |
| Occupied office — restricted hours | 1.25× |
| Government building (security, clearances, elevator-only) | 1.40× |
| Hospital / active healthcare | 1.50× |
| After-hours only (nights/weekends) | 1.35× |
| High-rise elevator access only | 1.20× |

### 2. Lockers — Price Per Unit, Not Per LF
Lockers are always priced **per unit (each)**, not per lf.
- Standard locker (metal, full-height): **$35/each**
- Count the lockers from drawings or site notes
- 16 lockers × $35 = $560 (NOT 12 lf × $15 = $180)

### 3. Read the Ceiling Type Before Pricing
Don't assume T-bar. Check the drawings + key notes:
- Key note says "Demolish existing GWB ceiling" → use **$3.50/sf** (drywall rate)
- Drawing shows ACT grid → use **$1.00/sf** (T-bar rate)
- Complicated ceiling (diffusers, curves, lights) → use **$5.00/sf**
- Mixed: price each zone at its correct rate

### 4. Bin Sizing by Scope
| Scope Size | Bins |
|-----------|------|
| < 100 sf | 0.25 bin ($232) |
| 100–300 sf | 0.5 bin (~$463) |
| 300–600 sf | 1 bin ($720–927) |
| Per 500 sf of general TI demo | +1 bin |
| Heavy demo (concrete, tile) | +1 extra bin |

Never order a full bin for a sub-100 sf scope.

### 5. Door Openings — Jackhammer First, Sub Second
- **Single door opening in drywall/stud wall**: Labour item (0.5 crew-day) — no extra cost
- **Door opening in CMU/concrete block**: Jackhammer 1 day = $75 rental + labour
- **Slab penetration / saw cutting for drains**: $1,500 concrete cutting sub
- Only use the $1,500 sub-contractor line for major structural or slab cuts

### 6. Washroom-Specific Supplies
Any washroom or wet-area demo job should include in "Other Supplies":
- Extra poly, waterproofing materials, buckets, mold treatment
- Budget **$200–$350 for Other Supplies** on washroom jobs
- Standard 5% supplies add-on still applies on top

### 8. Minimum Job Floor — Never Go Below ~$1,900 on Any Callout
> **Root cause of Test #4 miss (-73%). Do not repeat.**

WCC never prices a job below the cost of sending a crew for a day. Even if the scope is tiny (30 SF of T-bar + some blinds), the economics demand a minimum charge.

**Rule:** If your total line-item cost comes out below ~$1,500, apply the minimum day rate instead:
- 1 crew-person × 1 day = ~$500 labour (foreman rate ×8 hrs)
- Mobilization = $250 flat
- Supplies 5% add-on = ~$37
- Minimum cost basis = ~$787 → at 20% markup = ~$945 **← STILL TOO LOW**

**Better rule (from actual WCC behaviour):** WCC minimum bid = **$1,900–$2,300** for any single-mobilization job regardless of scope. This covers:
- Crew wages for a half to full day
- Drive time, site setup, cleanup
- Insurance/overhead burden
- Admin time to issue quote and invoice

**When to apply:** Any estimate where calculated bid < $2,000. Flag it explicitly: *"Scope is small — applying WCC minimum callout of $1,900"* and let JP decide.

### 9. Markup for Small Clean Commercial TI = 15%, Not 20%
> **Lesson from Test #3 (Crossroads Law): 15% hit -1.6% vs actual. 20% hit +2.7%.**

For small, clean commercial TI jobs (no hazmat, simple finishes, < $3,500 total bid):
- Use **15% markup** as the starting point
- 20% is correct for medium/complex jobs
- 11% is reserved for very competitive government/institutional bids

Clark's markup selection guide:
| Job type | Default markup |
|----------|---------------|
| Small clean TI (< $3,500) | 15% |
| Standard commercial TI | 20% |
| Competitive gov/institutional | 11–15% |
| Hazmat / complex / high-risk | 20–25% |

### 7. Hazmat/Abatement Labour = Standard WCC Crew Rates (NOT Specialist Rates)
> **This was the root cause of Test #2 overshoot (+20.2%). Do not repeat this mistake.**

WCC self-performs all abatement work with their own trained crew. The crew doing lead tile or ACM removal are the **same foreman and labourers** as any other job.

- ✅ **Correct**: Foreman $68–70/hr + Labourer $58–60/hr — for ALL work including hazmat
- ❌ **Wrong**: Using $40–46/hr "abatement tech" rates for the main labour
- The Abatement section in the Excel sheet is for **MATERIALS & EQUIPMENT only** (suits, HEPA vac, bags, negative air) — NOT labour
- Hazmat complexity is absorbed into overhead and markup (pad to 15–20%), not into hourly rates
- Lead tile production rate is slower (~200–300 sf/crew-day) — factor this into crew-days, not into rate

**When in doubt:** If a human is holding a tool, they're billed at standard WCC labour rates. If it's a machine, bag, or consumable, it's in the Abatement section.

---

## Real Bid Examples (from Completed Files)

### CFIA Gender-Neutral Washroom Refit (Small Washroom TI)
- **Type**: Single washroom renovation demo
- **Scope**: Wall finishes, ceiling, fixtures, flooring
- **Sub-Total (costs)**: ~$4,248
- **Trucking**: $463 retail / $360 cost (22% margin on trucking)
- **Markup selected**: 11–12%
- **Bid price**: ~$4,716
- **Lesson**: Small jobs use 11% markup — volume compensates, relationship matters

### Emily Carr University Space Renovations (Multi-Area TI)
- **Type**: Multi-scope university TI across 4 work areas
- **Areas**: MW-164 Office, MW-189 President's Suite, MW-198 Office Capture, MW-201 Faith Room, MW-209 Sculpture Room
- **Scope**: T-bar ceilings, drywall ceilings, partition walls, flooring (tile, carpet, engineered wood), millwork, doors, washrooms
- **Takeoff**: Quantities done area-by-area, then summed
- **Special**: Faith Room ceiling height noted (scissor lift required = $2/sf T-bar)
- **Lesson**: Use the U-column in Estimating sheet to label each area; sum totals in Project Cost

### Richardson International North Vancouver
- **Type**: Commercial office TI
- **Scope**: Complicated drywall ceiling, carpet tile, partition walls, drywall removal
- **Different template version**: Older sheet with 13 scope rows (not 23) — shows template evolves
- **Lesson**: If older drawings reference a different sheet layout, look for the closest matching line item

### CO-OP Parallel FS Doctors Office
- **Key assumption noted**: "ASSUMED ENTIRE PHARMACY HAS T-BAR CEILING; TO BE REMOVED AND DISPOSED"
- "WALLS UP TO Q-DECK (HEIGHT: 26'-7" FROM THE GROUND)" → use $30–35/lf rate
- **Lesson**: Always note ceiling heights; note when assuming scope from unclear drawings

### UDGA Office (777 Hornby)
- **Key note**: "36' OF WALLS WITH GLAZED PANELS — *NO HAZMAT REPORT"
- **Lesson**: "No Hazmat Report" is a flag Clark must always call out in assumptions

---

## Clark's Estimate Checklist (Before Declaring Draft-Ready)

### Step 1 — Gather inputs
- [ ] Bid Documents (scope letter / IFT) downloaded from Dropbox
- [ ] Drawings downloaded (at minimum: Demo Plan, RCP, Floor Finish schedule)
- [ ] Hazmat report downloaded (or flag: NO HAZMAT REPORT)
- [ ] Identified: building age, building type, floors in scope, occupied or vacant

### Step 2 — Read scope
- [ ] Identified ALL scope items with quantities (sf, lf, or each)
- [ ] Noted ceiling heights per area (affects T-bar and drywall rates)
- [ ] Noted any hazmat findings (triggers abatement section)
- [ ] Identified phasing requirements (if multi-phase, add mobilization)
- [ ] Checked for salvage items ("owner to retain" = DO NOT demo)
- [ ] Noted restricted working hours

### Step 3 — Fill Estimating sheet
- [ ] One row per scope item per area (use U column for area labels)
- [ ] Quantities in col R (sf/lf/each)
- [ ] Price selected from standard table (col C) — note if adjusting and why
- [ ] Totals calculated per area at bottom (rows 48–49: Total and $/sf)

### Step 4 — Fill Project Cost sheet
**Equipment:**
- [ ] Added Ramboard if hardwood/tile floors in building
- [ ] Added Hepa-Vac days ($35/day × job duration)
- [ ] Added Negative Air if abatement or dusty work
- [ ] Added consumables appropriate to scope

**Mobilization:**
- [ ] Mob – Tools and crew: $250 (always)
- [ ] Added Flooring Machine if floor scraper needed
- [ ] Added Rental Gear if specialty rental required

**Labour:**
- [ ] Foreman hours = sum of all scope days × 8 hrs × foreman retail rate
- [ ] Labourer hours = crew count × days × 8 hrs × labourer retail rate
- [ ] Cross-check: total retail labour ÷ $65/hr avg = crew-days; does it make sense for the scope?

**Trucking & Bins:**
- [ ] Estimated number of bins by material type and volume
- [ ] Added dump truck if needed

**Dump Fees:**
- [ ] Estimated tonnage for drywall, concrete, garbage separately

**Abatement (if applicable):**
- [ ] Abatement techs added with correct rates
- [ ] Negative air days, ducting, bags, suits added

**Travel:**
- [ ] LOA added if job is out of Lower Mainland

**Sub-Contractors:**
- [ ] Concrete cutting added if saw cutting required

### Step 5 — Check assumptions and qualifications
- [ ] All standard qualifications included in notes
- [ ] Hazmat assumptions added (or confirmed clean)
- [ ] Flagged all assumptions Clark made (ceiling height, phase count, hazmat status)
- [ ] Note the markup % used and reason

### Step 6 — Output
- [ ] Excel saved to `/Takeoff - Virtual Estimator/Demo Quote [Project Name].xlsx`
- [ ] All assumptions labeled with severity (🚩 FLAG / ⚠️ WARN / ℹ️ INFO)
- [ ] Posted estimate_data JSON to West Crow dashboard via API
- [ ] Status set to `clark_draft` — waiting for JP review

### Quick Calculator (optional sanity check tool)
The West Crow Dashboard has a built-in estimate calculator at `/estimate-calculator`.
Accessible via the **🧮 Quick Calculator** button on any bid detail page.

Use it when:
- You want to quickly sanity-check your unit price math before building the full Excel
- You need to show JP multiple markup options side-by-side (11/15/20/25%)
- You want to generate a copy-pasteable summary of line items + totals

It uses the same unit price database as this knowledge base. It does **not** replace the Excel — it's a cross-check tool. Crew-days estimate is rough (totalCost / 500). Always finalize in Excel.

---

## Dropbox API Access

```bash
TOKEN=$(grep DROPBOX_TOKEN ~/.openclaw/workspace/.env | cut -d= -f2-)

# List a bid folder:
curl -s -X POST https://api.dropboxapi.com/2/files/list_folder \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"path": "/West Crow Estimators/[PROJECT NAME]", "recursive": true}'

# Download a file:
curl -s -X POST https://content.dropboxapi.com/2/files/download \
  -H "Authorization: Bearer $TOKEN" \
  -H "Dropbox-API-Arg: {\"path\": \"/West Crow Estimators/[PATH]\"}" \
  -o output.pdf
```

**Completed bids available for reference**: `/West Crow Estimators/1111 COMPLETED/` (21 jobs)
**Active bids**: `/West Crow Estimators/` root level (280+ folders)
**Template**: `/West Crow Estimators/Demo Quote Sheet - Template 2024.xlsx`
**Cached locally**: `~/.openclaw/workspace/dropbox-cache/`

---

## Drawing Intake Pipeline

When Clark receives a bid to estimate, use this pipeline to extract scope from drawings:

### Step 1 — Fetch drawings from Dropbox

```bash
bash ~/.openclaw/workspace/skills/clark/scripts/fetch_drawings.sh "/West Crow Estimators/[PROJECT NAME]/Drawings/"
```

This downloads all PDFs to `~/.openclaw/workspace/clark-workspace/[project-slug]/drawings/` and prints local paths.

### Step 2 — Extract text and scope hints

```bash
python3 ~/.openclaw/workspace/skills/clark/scripts/read_drawing.py --input /path/to/drawing.pdf
```

Outputs a structured Markdown report with:
- Title block metadata (project, sheet, scale, discipline)
- All dimensions and measurements found (feet-inches, SF, LF, EA)
- Scope-relevant text (DEMO, REMOVE, ABATE, HAZMAT keywords)
- Floor finish schedule keywords (VCT, CARPET, TILE, HARDWOOD, VINYL)
- Ceiling types and heights (ACT, T-bar, GWB, AFF annotations)
- Any tables/schedules found (room schedules, door schedules, finish schedules)
- Page image paths for visual analysis

Options:
- `--no-images` — skip image rendering (faster, text only)
- `--output-dir /path/` — custom directory for page images
- `--dpi 200` — higher DPI for dense drawings

### Step 3 — Visual analysis (for drawings with limited text)

For each page image output by read_drawing.py, use the `image` tool with this prompt:

> "This is page [N] of an architectural drawing set for a demolition/renovation project. Extract:
> 1. All rooms visible and their approximate dimensions (SF)
> 2. All demo items indicated (hatching, 'DEMO' labels, dashed existing lines)
> 3. Ceiling types noted (T-bar/ACT, drywall, GWB)
> 4. Floor finish schedule or legend visible
> 5. Any hazmat notes or special demolition instructions
> 6. Ceiling heights noted
> List each item with quantity/unit where possible."

### Step 4 — Build estimate

Use extracted scope to fill the estimate builder per CLARK_WESTCROW.md rules. Map scope hints to West Crow line items:
- DEMO / REMOVE → selective demolition, equipment, disposal
- ABATE / HAZMAT → coordinate with hazmat survey, price separately
- SF dimensions → floor demo, floor prep, floor finish removal
- LF dimensions → partition removal, perimeter items
- ACT / T-bar ceiling → ceiling grid and tile removal (SF)
- GWB / drywall ceiling → drywall demo (SF)
- VCT / CARPET / TILE → floor finish removal (SF)

---

## PDF Vector Line Detection — Measuring Demo Walls

When a drawing is a vector PDF (AutoCAD/Revit export), use PyMuPDF to extract line geometry directly instead of image processing. This gives accurate LF measurements without OCR or manual scaling.

### Key Findings (Skechers Metrotown D1 demo plan, Feb 2026)

- **Gray color (RGB ≈ 0.5, 0.5, 0.5)** = walls/elements to demolish
- **Black color (RGB = 0, 0, 0)** = walls/elements to remain
- Dashed appearance in CAD exports is NOT encoded as a PDF dash property (`[] 0` = solid for all paths) — dashes are rendered as many short solid segments
- No OCG/layer info in this PDF — all paths have empty `layer` field
- Page scale: 3/16" = 1'-0" → `PT_PER_FOOT = 72 × 0.1875 = 13.5`

### Algorithm for Measuring Interior Demo Partition Walls

```python
import fitz, math
from collections import defaultdict

doc = fitz.open(PDF_PATH)
page = doc[PAGE_INDEX]
PT = 13.5  # pts per foot at 3/16"=1'-0"; adjust for other scales
PX, PY = page.rect.width, page.rect.height

# 1. Find the lease boundary lines first (long gray H/V lines)
#    These tell you the actual space extents
# 2. Set SPACE_X1/X2, SPACE_Y1/Y2 just INSIDE those boundary lines
# 3. Collect gray segments within space boundary

paths = page.get_drawings()
gray_walls = []
for p in paths:
    color = p.get('color')
    if color is None: continue
    r, g, b = color
    if not (0.48 < r < 0.52): continue  # gray check
    for item in p.get('items', []):
        if item[0] != 'l': continue
        x1, y1 = float(item[1].x), float(item[1].y)
        x2, y2 = float(item[2].x), float(item[2].y)
        slen = math.sqrt((x2-x1)**2 + (y2-y1)**2)
        if slen < 2: continue
        mx, my = (x1+x2)/2, (y1+y2)/2
        if SPACE_X1 < mx < SPACE_X2 and SPACE_Y1 < my < SPACE_Y2:
            gray_walls.append((x1, y1, x2, y2, slen))

# 4. Group collinear segments into wall lines
h_by_y = defaultdict(list)
v_by_x = defaultdict(list)
for x1, y1, x2, y2, slen in gray_walls:
    if abs(y2-y1) < 2:  # horizontal
        y_key = round((y1+y2)/2 / 6) * 6
        h_by_y[y_key].append((min(x1,x2), max(x1,x2), slen))
    elif abs(x2-x1) < 2:  # vertical
        x_key = round((x1+x2)/2 / 6) * 6
        v_by_x[x_key].append((min(y1,y2), max(y1,y2), slen))

# 5. For each group: sum the span (max coord - min coord) = wall length
total_lf = 0
for y_key, segs in h_by_y.items():
    span = max(s[1] for s in segs) - min(s[0] for s in segs)
    total_lf += span / PT
for x_key, segs in v_by_x.items():
    span = max(s[1] for s in segs) - min(s[0] for s in segs)
    total_lf += span / PT

print(f"Interior demo walls: {total_lf:.0f} LF")
```

### Critical Pitfalls

- **Legend/hatching contamination**: The plan sheet has hatching in the legend area. ALWAYS tighten the space boundary to be strictly inside the lease lines, not just inside the "plan area". Hatching creates hundreds of short parallel lines at specific X or Y positions, inflating counts.
- **Lease boundary lines**: Long gray lines (>20 ft) at consistent Y or X positions are the lease/demising lines — NOT interior walls. They define the space extents, not scope.
- **Near-duplicate walls**: Dashed lines render as clusters of segments at nearly-same positions (e.g., y=1344, 1348, 1352...). Use a 6pt snap grid when grouping by position to merge duplicates.
- **Scale varies by sheet**: Always confirm scale from the drawing title block before computing PT_PER_FOOT.
- **No layers in export**: AutoCAD→PDF often flattens layers. Color is the reliable differentiator.

### Scale Reference Table

| Drawing Scale | pts/foot (at 72 DPI) |
|---|---|
| 3/16" = 1'-0" | 13.5 |
| 1/8" = 1'-0" | 9.0 |
| 1/4" = 1'-0" | 18.0 |
| 1/16" = 1'-0" | 4.5 |
| 1" = 1'-0" | 72.0 |

