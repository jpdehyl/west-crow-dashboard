import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#2d2d2d",
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 48,
    lineHeight: 1.4,
  },
  headerBlock: {
    marginBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: "#2d2d2d",
    paddingBottom: 10,
  },
  companyName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#2d2d2d",
    marginBottom: 2,
  },
  companyAddress: {
    fontSize: 8,
    color: "#555555",
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: "row",
  },
  headerField: {
    flex: 1,
    paddingRight: 8,
  },
  headerLabel: {
    fontSize: 7,
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  headerValue: {
    fontSize: 9,
    color: "#2d2d2d",
    fontFamily: "Helvetica-Bold",
  },
  introPara: {
    fontSize: 9,
    color: "#333333",
    marginBottom: 14,
    lineHeight: 1.6,
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    backgroundColor: "#2d2d2d",
    padding: "5 8",
    marginBottom: 4,
    marginTop: 10,
  },
  subHeader: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#2d2d2d",
    marginBottom: 4,
    marginTop: 4,
  },
  table: {
    marginBottom: 6,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderTopWidth: 1,
    borderTopColor: "#cccccc",
    borderBottomWidth: 1,
    borderBottomColor: "#cccccc",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#dddddd",
  },
  tableTotalRow: {
    flexDirection: "row",
    borderTopWidth: 1.5,
    borderTopColor: "#2d2d2d",
    backgroundColor: "#f9f9f9",
    marginTop: 2,
  },
  colDesc: { flex: 3, padding: "3 5" },
  colQty:  { flex: 1, padding: "3 5", textAlign: "right" },
  colTotal:{ flex: 1, padding: "3 5", textAlign: "right" },
  tableHeaderText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#555555",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableRowText: {
    fontSize: 8.5,
    color: "#2d2d2d",
  },
  tableTotalLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#2d2d2d",
    flex: 4,
    padding: "4 5",
  },
  tableTotalValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#2d2d2d",
    flex: 1,
    padding: "4 5",
    textAlign: "right",
  },
  gstNote: {
    fontSize: 8,
    color: "#666666",
    fontStyle: "italic",
    marginTop: 4,
    marginBottom: 6,
  },
  tcItem: {
    marginBottom: 3,
    flexDirection: "row",
  },
  tcNum: {
    fontSize: 8.5,
    color: "#2d2d2d",
    width: 18,
    flexShrink: 0,
  },
  tcText: {
    fontSize: 8.5,
    color: "#2d2d2d",
    flex: 1,
    lineHeight: 1.5,
  },
  tcSubItem: {
    marginTop: 1,
    flexDirection: "row",
    paddingLeft: 18,
    marginBottom: 1,
  },
  tcSubText: {
    fontSize: 8,
    color: "#555555",
    flex: 1,
    lineHeight: 1.4,
  },
  bulletItem: {
    flexDirection: "row",
    marginBottom: 3,
  },
  bullet: {
    fontSize: 8.5,
    color: "#2d2d2d",
    width: 10,
  },
  bulletText: {
    fontSize: 8.5,
    color: "#2d2d2d",
    flex: 1,
    lineHeight: 1.5,
  },
  reminderBox: {
    borderWidth: 1,
    borderColor: "#cccccc",
    padding: 8,
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: "#fafafa",
  },
  reminderText: {
    fontSize: 8,
    color: "#444444",
    lineHeight: 1.5,
  },
  signatureBlock: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#cccccc",
    paddingTop: 10,
  },
  signatureText: {
    fontSize: 9,
    color: "#2d2d2d",
    marginBottom: 4,
  },
  signatureBindingText: {
    fontSize: 8,
    color: "#555555",
    fontStyle: "italic",
    marginBottom: 14,
  },
  signatureLineRow: {
    flexDirection: "row",
  },
  signatureField: {
    flex: 1,
    paddingRight: 20,
  },
  signatureLabel: {
    fontSize: 7,
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#2d2d2d",
  },
})

// ── Boilerplate ──────────────────────────────────────────────────────────────

const TC_ITEMS: Array<{ num: string; text: string; subs?: string[] }> = [
  { num: "1.", text: "All finishes are assumed to be single-layer." },
  { num: "2.", text: "Work is priced on the basis of a single phase and uninterrupted workflow, unless otherwise specified." },
  {
    num: "3.",
    text: "The base price is subject to increase if:",
    subs: [
      "a. HAZMAT is found (above & beyond what was quoted for)",
      "b. Multi-layered finishes are required to be removed",
      "c. Demo plans or specifications are not complete",
      "d. Work is to be done outside of regular working hours (8 am -4 pm)",
      "e. Removal of the substrates requires more than usual amounts of labour.",
      "f. Concealed materials are found",
      "g. If there is a designated QP or HAZMAT Consultant working with the owner/GC not previously disclosed at the tender",
      "h. Lead-containing materials are characterized as leachable toxic",
    ],
  },
  { num: "4.", text: "Any additional mobilizations will be billed at $950 each, which includes tools, equipment, and trucking re-mobilization." },
  { num: "5.", text: "Any salvageable materials, unless otherwise specified, are the property of West Crow" },
  { num: "6.", text: "Any permits required to carry out the work are the responsibility of the customer or general contractor" },
  { num: "7.", text: "GC or Client is to ensure there is suitable toilet and water facilities for crews" },
  { num: "8.", text: "If the building was constructed before 1990 a full hazmat survey (or Pre-renovation Hazmat survey) must be provided by an insured and qualified professional (AHERA or similar)" },
  { num: "9.", text: "GC to provide electrical isolation and written confirmation by qualified electrician (Identified/Isolated/Locked out) prior to commencement of work" },
  { num: "10.", text: "All power demands required to carry out the scope of work shall be the responsibility of the client/GC to provide" },
  { num: "11.", text: "All waste remains the property of the owner and a British Columbia Generator (BCG) number is needed from the owner prior to the waste being removed from the site. The BCG must be provided three days in advance of the completion of the project. All waste will be disposed of at Registered Landfills" },
  { num: "12.", text: "We require a contract, purchase order number, letter of intent, signed copy of this quote, or written confirmation prior to starting work" },
  { num: "13.", text: "Work confirmed by a purchase order and or by a signed copy of the quote will be considered as a contract and therefore subject to Canadian Contract law" },
  { num: "14.", text: "If a Qualified Professional is required by the city, we will be notified before the project begins, and it will be paid for by the GC/Client" },
  { num: "15.", text: "If other trades deposit their garbage in West Crow bins there will be a $1500 back charge for the separation of contaminated loads or the waste will be removed and left in the loading bay" },
  { num: "16.", text: "Any damage occurred during the course of demolition must be fixed/filled/leveled by others" },
  { num: "17.", text: "West Crow will carry out general cleanup in the work area, removing debris and residues from the demolition site. If the project requires professional and detailed cleaning, it must be done by others" },
  { num: "18.", text: "GC will remove all office furniture, equipment, garbage, and personal belongings. Empty space is required to start the work" },
  { num: "19.", text: "GC will provide temporary light and power for after hour/night shift" },
  { num: "20.", text: "GC will ensure the HVAC shut off during the abatement job" },
  { num: "21.", text: "Any thermostats, smoke detectors, security panels/cameras, alarm sensors, TVs, or other electronic devices will be removed and protected by others and West Crow is not responsible for any damage" },
  { num: "22.", text: "GC will provide security and protection for opened/exposed areas after the demolition" },
  { num: "23.", text: "Any additional paperwork such as criminal records will be an extra charge" },
  { num: "24.", text: "Progressive release of holdbacks, as per the Section 7(8) of the BC Lien Act, will be honored." },
]

const BOILERPLATE_EXCLUSIONS = [
  "Disposal bins for load out must be placed in a secure area no more than 50 feet from the demolition area",
  "Disposal bins must stay on site for the duration of the project",
  "Plumbing, sprinkler, electrical, HVAC, security, automation disconnections/demolition/disposal unless otherwise specified",
  "Preparation to receive new finish on any surface",
  "Concrete cutting, concrete scanning, concrete polishing, concrete patching or repairing",
  "Security and protection for opened/exposed areas after the demolition",
  "Structural demo/modification such as beams, columns, shearwalls, stairs, etc",
  "Structural support in case structural demolition is required",
  "Hoarding",
]

// ── Types ────────────────────────────────────────────────────────────────────

export interface ProposalLineItem {
  description: string
  qty_unit: string
  total: number
}

export interface ProposalData {
  jobAddress: string
  projectName: string
  printDate: string
  estimateNumber: string
  lineItems: ProposalLineItem[]
  grandTotal: number
  assumptions: string[]
  extraExclusions?: string[]
}

// ── Formatter ────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

// ── Document ─────────────────────────────────────────────────────────────────

export function ProposalDocument({ data }: { data: ProposalData }) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>

        {/* Header */}
        <View style={styles.headerBlock}>
          <Text style={styles.companyName}>West Crow Contracting Ltd.</Text>
          <Text style={styles.companyAddress}>
            6976 Palm Ave Burnaby, BC V5J 4M3 | Phone: 604-399-4644
          </Text>
          <View style={styles.headerRow}>
            <View style={styles.headerField}>
              <Text style={styles.headerLabel}>Job Address</Text>
              <Text style={styles.headerValue}>{data.jobAddress || "—"}</Text>
            </View>
            <View style={styles.headerField}>
              <Text style={styles.headerLabel}>Project Name</Text>
              <Text style={styles.headerValue}>{data.projectName || "—"}</Text>
            </View>
            <View style={styles.headerField}>
              <Text style={styles.headerLabel}>Print Date</Text>
              <Text style={styles.headerValue}>{data.printDate}</Text>
            </View>
            <View style={styles.headerField}>
              <Text style={styles.headerLabel}>Estimate #</Text>
              <Text style={styles.headerValue}>{data.estimateNumber || "—"}</Text>
            </View>
          </View>
        </View>

        {/* Intro */}
        <Text style={styles.introPara}>
          The estimated price noted below is based on the information provided by the general
          contractor. Please, carefully read the assumptions and exclusions described in the
          terms and conditions. This Quote will be valid for 30 days from its date of issue.
        </Text>

        {/* Base Bid */}
        <Text style={styles.sectionHeader}>Base Bid</Text>
        <Text style={styles.subHeader}>Demolition Items</Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.colDesc}><Text style={styles.tableHeaderText}>Description</Text></View>
            <View style={styles.colQty}><Text style={styles.tableHeaderText}>Qty / Unit</Text></View>
            <View style={styles.colTotal}><Text style={styles.tableHeaderText}>Total Price</Text></View>
          </View>

          {data.lineItems.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <View style={styles.colDesc}><Text style={styles.tableRowText}>{item.description}</Text></View>
              <View style={styles.colQty}><Text style={styles.tableRowText}>{item.qty_unit}</Text></View>
              <View style={styles.colTotal}><Text style={styles.tableRowText}>{fmtCurrency(item.total)}</Text></View>
            </View>
          ))}

          <View style={styles.tableTotalRow}>
            <Text style={styles.tableTotalLabel}>Total Price:</Text>
            <Text style={styles.tableTotalValue}>{fmtCurrency(data.grandTotal)}</Text>
          </View>
        </View>

        <Text style={styles.gstNote}>*** Price does not include 5% GST ***</Text>

        {/* Terms & Conditions */}
        <Text style={styles.sectionHeader}>Terms & Conditions</Text>
        {TC_ITEMS.map((item) => (
          <View key={item.num}>
            <View style={styles.tcItem}>
              <Text style={styles.tcNum}>{item.num}</Text>
              <Text style={styles.tcText}>{item.text}</Text>
            </View>
            {item.subs?.map((sub, si) => (
              <View key={si} style={styles.tcSubItem}>
                <Text style={styles.tcSubText}>{sub}</Text>
              </View>
            ))}
          </View>
        ))}

        {/* Project Assumptions */}
        {data.assumptions.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>B. Project Assumptions</Text>
            {data.assumptions.map((a, i) => (
              <View key={i} style={styles.bulletItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>{a}</Text>
              </View>
            ))}
          </>
        )}

        {/* Exclusions */}
        <Text style={styles.sectionHeader}>C. Project Exclusions</Text>
        {[...BOILERPLATE_EXCLUSIONS, ...(data.extraExclusions ?? [])].map((e, i) => (
          <View key={i} style={styles.bulletItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>{e}</Text>
          </View>
        ))}

        {/* Reminder */}
        <View style={styles.reminderBox}>
          <Text style={styles.reminderText}>
            * All plumbing, Electrical, Mechanical, Security/automation, and Gas disconnections must by others and made safe prior work commencing.{"\n"}
            * Electrical isolation (identify/isolate/lockout) must be completed by a Qualified Electrician and West Crow is to be notified in writing prior work commencing.
          </Text>
        </View>

        {/* Signature */}
        <View style={styles.signatureBlock}>
          <Text style={styles.signatureText}>Sincerely, Estimating Department, West Crow Contracting Ltd.</Text>
          <Text style={styles.signatureBindingText}>
            I confirm that my action here represents my electronic signature and is binding.
          </Text>
          <View style={styles.signatureLineRow}>
            <View style={styles.signatureField}>
              <Text style={styles.signatureLabel}>Signature</Text>
              <View style={styles.signatureLine} />
            </View>
            <View style={styles.signatureField}>
              <Text style={styles.signatureLabel}>Date</Text>
              <View style={styles.signatureLine} />
            </View>
            <View style={styles.signatureField}>
              <Text style={styles.signatureLabel}>Print Name</Text>
              <View style={styles.signatureLine} />
            </View>
          </View>
        </View>

      </Page>
    </Document>
  )
}

// ── Build ProposalData from bid + estimate ────────────────────────────────────

export function buildProposalData(bid: any, estimateData: any): ProposalData {
  const today = new Date().toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const cfg = estimateData?.config ?? {
    cost_per_man_day: 296,
    material_pct: 18,
    overhead_pct: 12,
    profit_pct: 30,
    subtrade_markup: 15,
  }

  const lineItems: ProposalLineItem[] = []

  // Sections (own forces)
  for (const section of estimateData?.sections ?? []) {
    for (const item of section.items ?? []) {
      if (!item.active || !item.units || item.units === 0) continue
      const manDays = item.units_per_day > 0 ? item.units / item.units_per_day : 0
      const labour = manDays * cfg.cost_per_man_day
      const materialCost = item.has_material ? labour * (cfg.material_pct / 100) : 0
      const totalCost = labour + materialCost
      const overhead = totalCost * (cfg.overhead_pct / 100)
      const profit = totalCost * (cfg.profit_pct / 100)
      const total = totalCost + overhead + profit
      lineItems.push({
        description: item.description,
        qty_unit: `${item.units} ${item.unit_type ?? ""}`.trim(),
        total,
      })
    }
  }

  // Subtrades
  for (const sub of estimateData?.subtrades ?? []) {
    if (!sub.active || !sub.units || sub.units === 0) continue
    const raw = sub.units * sub.unit_cost
    const total = raw * (1 + (cfg.subtrade_markup ?? 15) / 100)
    lineItems.push({
      description: sub.description,
      qty_unit: `${sub.units} ${sub.unit_type ?? ""}`.trim(),
      total,
    })
  }

  const grandTotal = estimateData?.grand_total ?? lineItems.reduce((s, i) => s + i.total, 0)

  // Assumptions
  const assumptions: string[] = []
  for (const a of estimateData?.meta?.assumptions ?? []) {
    assumptions.push(typeof a === "string" ? a : a.text)
  }
  for (const a of estimateData?.clark_draft?.assumptions ?? []) {
    assumptions.push(typeof a === "string" ? a : a.text)
  }

  return {
    jobAddress: bid.address ?? bid.project_name ?? "",
    projectName: bid.project_name ?? "",
    printDate: today,
    estimateNumber: bid.estimate_number ?? "",
    lineItems,
    grandTotal,
    assumptions: [...new Set(assumptions)],
  }
}
