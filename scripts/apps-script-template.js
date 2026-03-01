/**
 * West Crow Dashboard — Google Apps Script: Sheet → Webhook Sync
 * =============================================================
 * SETUP (3 steps):
 *
 * 1. In your Google Sheet, open Extensions > Apps Script and paste this entire file.
 *
 * 2. Set the two constants below:
 *      WEBHOOK_URL    — your Vercel deployment URL + "/api/webhooks/sheet-update"
 *      WEBHOOK_SECRET — same value as SHEET_WEBHOOK_SECRET in Vercel env vars
 *
 * 3. In the Apps Script editor, click the clock icon (Triggers), add a trigger:
 *      Choose function: onSheetChange
 *      Event source:   From spreadsheet
 *      Event type:     On change
 *    Save. Authorize when prompted.
 *
 * That's it! Every time you edit the sheet, changes sync to the dashboard.
 */

// ── CONFIG — update these two values ──────────────────────────────────────────
var WEBHOOK_URL    = "https://YOUR-APP.vercel.app/api/webhooks/sheet-update";
var WEBHOOK_SECRET = "your-webhook-secret-here";
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Main trigger function. Wired to the "On change" spreadsheet trigger.
 * Reads bidId from Config!A2, collects line items, and POSTs to the webhook.
 */
function onSheetChange() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── Read bidId from hidden Config sheet ────────────────────────────────────
  var configSheet = ss.getSheetByName("Config");
  if (!configSheet) {
    Logger.log("Config sheet not found — skipping sync.");
    return;
  }

  var bidId = configSheet.getRange("A2").getValue();
  if (!bidId) {
    Logger.log("No bidId in Config!A2 — skipping sync.");
    return;
  }

  // ── Collect line items from Sheet1 ────────────────────────────────────────
  // Columns: D = description, G = man_days, L = total
  // Skips: header rows (rows 1-4), section header rows (D empty or L non-numeric)
  var dataSheet = ss.getSheetByName("Sheet1");
  if (!dataSheet) {
    Logger.log("Sheet1 not found — skipping sync.");
    return;
  }

  var lastRow = dataSheet.getLastRow();
  // Read columns D (4), G (7), L (12) in one call for efficiency
  var descRange    = dataSheet.getRange(5, 4, lastRow - 4, 1).getValues();   // col D
  var manDaysRange = dataSheet.getRange(5, 7, lastRow - 4, 1).getValues();   // col G
  var totalRange   = dataSheet.getRange(5, 12, lastRow - 4, 1).getValues();  // col L

  var lineItems = [];

  for (var i = 0; i < descRange.length; i++) {
    var description = String(descRange[i][0]).trim();
    var total       = totalRange[i][0];
    var manDays     = manDaysRange[i][0];

    // Skip if description is empty (section header spacer row)
    if (!description) continue;

    // Skip if total is not a real number (formula returned empty or text)
    if (typeof total !== "number" || isNaN(total) || total === 0) continue;

    // Skip grand total / subtotal summary rows
    if (description.toLowerCase().indexOf("total") !== -1) continue;

    lineItems.push({
      description: description,
      man_days: (typeof manDays === "number" && !isNaN(manDays)) ? manDays : null,
      total: total
    });
  }

  if (lineItems.length === 0) {
    Logger.log("No line items found — skipping sync.");
    return;
  }

  // ── POST to webhook ───────────────────────────────────────────────────────
  var payload = JSON.stringify({ bidId: String(bidId), lineItems: lineItems });

  var options = {
    method: "post",
    contentType: "application/json",
    headers: { "x-webhook-secret": WEBHOOK_SECRET },
    payload: payload,
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    var code = response.getResponseCode();
    var body = response.getContentText();
    Logger.log("Webhook response " + code + ": " + body);

    if (code !== 200) {
      Logger.log("WARNING: Webhook returned non-200 status. Check WEBHOOK_URL and WEBHOOK_SECRET.");
    }
  } catch (e) {
    Logger.log("Webhook error: " + e.toString());
  }
}
