// Stetheros Industries website: configuration.
//
// SHEET_CSV_URL is the "Publish to web" CSV link of the Constants tab.
// CATALOG_CSV_URL is the "Publish to web" CSV link of the Catalog tab.
// Each tab has its own link (see README.md). Leave a link empty to run on the
// built-in starting values (constants) or the example items (catalog).
window.SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSZUn_e6HAYiMersD33BJ_7LhHgQ7I0V1xvDrM36g9WTkrhH6NckrzF8roG3BKc5r6fi_NqKMD3bZu7/pub?gid=1971219426&single=true&output=csv";
window.CATALOG_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSZUn_e6HAYiMersD33BJ_7LhHgQ7I0V1xvDrM36g9WTkrhH6NckrzF8roG3BKc5r6fi_NqKMD3bZu7/pubhtml?gid=1616221061&single=true";

// Every constant the calculator uses. The sheet overrides `value` by `key`.
// `min` and `max` are safety limits: a sheet value outside them is ignored,
// the default is used instead, and the page shows a warning. They are kept
// in code on purpose, so a typo in the sheet cannot silently change results.
// `pct: true` means the value is a fraction (0.25) and is shown as 25%.
// The sheet may hold either 0.25 or 25%.
window.CONSTANT_SPEC = [
  { key: "member_share",          label: "Member share of revenue",                    section: "4.1",  value: 0.80, min: 0, max: 1,   pct: true },
  { key: "upfront_fraction",      label: "Up-front share of the member's cut",         section: "4.3",  value: 0.20, min: 0, max: 1,   pct: true },
  { key: "proven_weeks",          label: "Weeks with sales needed for proven revenue", section: "4.4",  value: 3,    min: 1, max: 52 },
  { key: "proven_window",         label: "Window for proven revenue (weeks)",          section: "4.4",  value: 4,    min: 1, max: 52 },
  { key: "cover_weeks",           label: "Weeks of stock cover (τ)",              section: "5.2",  value: 2,    min: 0, max: 52 },
  { key: "multiplier_start",      label: "Early-contribution multiplier at launch",    section: "6.3",  value: 1.5,  min: 1, max: 5 },
  { key: "multiplier_weeks",      label: "Weeks until the multiplier reaches 1",       section: "6.3",  value: 6,    min: 1, max: 104 },
  { key: "dividend_rate",         label: "Dividend rate (ρ)",                     section: "6.5",  value: 0.25, min: 0, max: 1,   pct: true },
  { key: "dividend_equity_share", label: "Share of a dividend paid by equity",         section: "6.5",  value: 0.85, min: 0, max: 1,   pct: true },
  { key: "activity_threshold",    label: "Activity test fraction",                     section: "6.6",  value: 0.5,  min: 0, max: 10 },
  { key: "decay_start",           label: "Weeks of inactivity before decay starts",    section: "6.8",  value: 6,    min: 0, max: 104 },
  { key: "decay_end",             label: "Weeks of inactivity when decay reaches the floor", section: "6.8", value: 12, min: 1, max: 208 },
  { key: "decay_floor",           label: "Decay floor",                                section: "6.8",  value: 0.5,  min: 0, max: 1,   pct: true },
  { key: "margin_weeks",          label: "Weeks of margin paid up front (H)",          section: "7.2",  value: 4,    min: 0, max: 52 },
  { key: "cash_limit",            label: "Weekly cash limit (share of treasury)",      section: "7.6",  value: 0.25, min: 0, max: 1,   pct: true },
  { key: "operator_share",        label: "Operator share of margin (ω)",          section: "7.7",  value: 0.20, min: 0, max: 1,   pct: true },
  { key: "infra_floor",           label: "Infrastructure payment floor (f)",           section: "7.8",  value: 0.5,  min: 0, max: 1,   pct: true },
  { key: "infra_max_cut",         label: "Largest cut per infrastructure review",      section: "7.8",  value: 0.25, min: 0, max: 1,   pct: true },
  { key: "staged_upfront",        label: "Share of an asset price paid at purchase (α)", section: "7.10", value: 0.5, min: 0, max: 1, pct: true },
  { key: "launch_share",          label: "Launch share for unproven goods",            section: "7.11", value: 0.5,  min: 0, max: 1,   pct: true },
  { key: "contract_quota",        label: "Committed quota, share of demand (κ)",  section: "8.1",  value: 0.5,  min: 0, max: 1,   pct: true },
  { key: "board_supermajority",   label: "Board supermajority",                        section: "9.2",  value: 0.66, min: 0.5, max: 1, pct: true },
  { key: "reimb_days",            label: "Reimbursement window (days)",                section: "10.1", value: 7,    min: 0, max: 60 },
  { key: "advance_threshold",     label: "Challenge-window threshold for member advances", section: "10.2", value: 0.10, min: 0, max: 1, pct: true },
  { key: "late_premium",          label: "Late premium per full week",                 section: "10.4", value: 0.10, min: 0, max: 1,   pct: true },
  { key: "late_cap",              label: "Late premium cap",                           section: "10.4", value: 0.30, min: 0, max: 5,   pct: true },
  { key: "tax_cut",               label: "Signatory sales-tax cut",                    section: "11.3", value: 0.20, min: 0, max: 1,   pct: true },
  { key: "bulk_discount",         label: "Bulk-order discount",                        section: null,   value: 0.15, min: 0, max: 1,   pct: true },
  { key: "citizen_discount",      label: "Citizen discount",                           section: "11.4", value: 0.10, min: 0, max: 1,   pct: true },
  { key: "pool_rate",             label: "Nation profit pool (share of profit)",       section: "11.5", value: 0.07, min: 0, max: 1,   pct: true },
  { key: "resale_multiple",       label: "Resale review multiple of the median buyer", section: "11.6", value: 5,    min: 1, max: 100 }
];
