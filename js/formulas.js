// Formulas shown in each calculator's "How this is calculated" panel.
// One entry per formula. Constants are written as symbols; the panel lists the
// value each symbol currently has. `derived: true` marks a rule the document
// states in words only.
window.FORMULAS = {
  upfront: {
    title: "Up-front payment and payment at sale",
    sections: ["4.1", "4.2", "4.3", "4.4", "4.5"],
    tex: String.raw`\begin{aligned}\text{Up-front} &= u \times s \times b_{\text{ref}}\\ \text{At sale} &= \max\bigl(0,\ s\,b - \text{Up-front}\bigr)\\ \text{Company} &= (1-s)\,b - \text{shortfall}\end{aligned}`,
    symbols: { s: "member_share", u: "upfront_fraction" },
    legend: "b is the sale price per unit and b_ref the reference price (§4.4). When the company pays for supplies, both are taken after the supply cost per unit, because the split then applies to profit after supplies (§4.2). The shortfall is any amount by which the up-front payment exceeds the member's cut.",
    plain: "For a good with proven revenue that is below its target stock and within your entitlement, part of your cut is paid when you deposit. The rest is paid when the unit sells. The up-front payment is a guarantee: if the unit sells for so little that your cut is less than it, you keep it, nothing more is paid, and the company bears the difference. Any other deposit is on consignment and paid in full at sale. If you pay for your own supplies, they come out of your 80%."
  },
  proven: {
    title: "Proven revenue and reference price",
    sections: ["4.4"],
    derived: true,
    tex: String.raw`\begin{aligned}&\text{Proven if weeks with sales} \ge w \text{ in the last } W \text{ weeks}\\ &p_{\text{ref}} = \frac{1}{k}\sum_{\text{weeks with sales}} \frac{\text{revenue}_w}{\text{units}_w}\end{aligned}`,
    symbols: { w: "proven_weeks", W: "proven_window" },
    legend: "k is the number of weeks in the window in which the good sold.",
    plain: "The reference price is the plain average of each week's average sale price, so every week with sales counts equally however many units sold that week."
  },
  target: {
    title: "Target stock",
    sections: ["5.2"],
    tex: String.raw`T_g = \tau\, D_g`,
    symbols: { "τ": "cover_weeks" },
    legend: "D_g is the good's expected weekly sales.",
    plain: "The company aims to hold a fixed number of weeks of expected sales of each good."
  },
  budget: {
    title: "Weekly guarantee budget",
    sections: ["5.3"],
    tex: String.raw`V_g = \max\bigl(0,\ T_g - S_g\bigr)`,
    legend: "S_g is the stock currently held.",
    plain: "The budget is the target stock minus the stock on hand, and never less than zero. At or above target, every deposit goes on consignment."
  },
  entitle: {
    title: "Entitlements",
    sections: ["5.4", "8.1"],
    tex: String.raw`\begin{aligned}q &= \frac{V_g}{n} && \text{(no contract holder)}\\ q_h &= \min(c_g,\ V_g) && \text{(contract holder)}\\ q &= \frac{V_g - q_h}{n-1} && \text{(everyone else)}\end{aligned}`,
    legend: "n is the number of active members; c_g is the holder's committed quota.",
    plain: "The budget is split equally among active members. If the good has a contract holder, the holder's quota is covered first and the rest is split among the other active members."
  },
  quota: {
    title: "Committed quota",
    sections: ["8.1"],
    tex: String.raw`c_g = \kappa\, D_g`,
    symbols: { "κ": "contract_quota" },
    plain: "A contract holder commits to a fixed share of the good's expected weekly demand."
  },
  share: {
    title: "Equity share",
    sections: ["6.2"],
    tex: String.raw`s_i = \frac{a_i\, E_i}{\sum_j a_j\, E_j}`,
    legend: "E_i is member i's points; a_i is 1 if the member is active and 0 if not.",
    plain: "Your share is your points divided by the total points of all active members. Inactive members are left out of the total."
  },
  multiplier: {
    title: "Early-contribution multiplier",
    sections: ["6.3"],
    tex: String.raw`m(t) = 1 + (m_0 - 1)\max\!\left(0,\ 1 - \frac{t}{W}\right)`,
    symbols: { m_0: "multiplier_start", W: "multiplier_weeks" },
    legend: "t is the number of weeks since server launch.",
    plain: "The multiplier starts high at launch, falls in a straight line, and stays at 1 after the cut-off week."
  },
  assetpay: {
    title: "Equity for an asset",
    sections: ["6.4"],
    tex: String.raw`E = \varphi\, v\, m(t), \qquad \text{cash or goods} = (1-\varphi)\, v`,
    legend: "v is the asset's set value (§7.4); φ is the fraction taken as equity.",
    plain: "Only the part of the value you take as equity earns points, and it is boosted by the early-contribution multiplier."
  },
  dividend: {
    title: "Dividend",
    sections: ["6.5"],
    tex: String.raw`D_i = \rho\, \Pi \left(e\, s_i + \frac{(1-e)\, a_i}{n}\right)`,
    symbols: { "ρ": "dividend_rate", e: "dividend_equity_share" },
    legend: "Π is profit; s_i is the equity share (§6.2); a_i is 1 for a member who shares the equal portion and 0 otherwise; n is the number who share it: every active member except a new member without equity in the first two weeks.",
    plain: "Part of profit is distributed. Most of it is paid by equity share, and the rest is split equally among active members, except new members without equity in their first two weeks. Inactive members receive nothing."
  },
  activity: {
    title: "Activity test",
    sections: ["6.6"],
    tex: String.raw`\sum_g \frac{x_{g}}{T_g} \ge \frac{k}{n}`,
    symbols: { k: "activity_threshold" },
    legend: "x_g is the amount of good g you deposited in the last two weeks; T_g is its target stock; n is the number of active members.",
    plain: "Each deposit is measured against that good's target stock and the fractions are added up. You pass if the total reaches the threshold divided by the number of active members. Completing a company task also passes the test, and a new member counts as active for the first two weeks after joining. A good with no target stock counts once the CEO or the board sets a target for it."
  },
  decay: {
    title: "Decay of inactive points",
    sections: ["6.8"],
    tex: String.raw`d(u) = \max\!\left(d_{\min},\ 1 - (1-d_{\min})\,\frac{\max(0,\ u - u_0)}{u_1 - u_0}\right)`,
    symbols: { d_min: "decay_floor", u_0: "decay_start", u_1: "decay_end" },
    legend: "u is the number of weeks since your last activity.",
    plain: "Nothing decays until the start week. After that the share of points kept falls in a straight line until it reaches the floor."
  },
  buyback: {
    title: "Buyback",
    sections: ["6.9"],
    tex: String.raw`\text{Buyback} = d \sum_k \varphi_k\, v_k`,
    legend: "For each asset k you sold: v_k is its set value and φ_k the fraction you took as equity. d is your decay factor when you leave.",
    plain: "You are bought out at the original equity value of your grants, without the early bonus, scaled by your decay factor."
  },
  keepsell: {
    title: "Keeping versus selling an asset",
    sections: ["7.2"],
    tex: String.raw`\theta > \frac{H}{s - \omega}`,
    symbols: { H: "margin_weeks", s: "member_share", "ω": "operator_share" },
    legend: "θ is the number of weeks the asset runs.",
    plain: "This is the document's formula, which assumes the company pays for supplies. Keeping pays more on cash alone once the asset has run longer than this many weeks. Equity, the early multiplier, and freed capital are the reasons to sell."
  },
  keepsell_totals: {
    title: "Keeping versus selling, with supply costs",
    sections: ["7.2", "4.2", "7.7"],
    derived: true,
    tex: String.raw`\begin{aligned}k &= \begin{cases} s\,R - C & \text{member pays supplies}\\ s\,(R - C) & \text{company pays supplies}\end{cases}\\ \text{Keep} &= k\,\theta, \qquad \text{Sell} = H\,m + \omega\, m\,\theta, \qquad m = R - C\\ \theta^{*} &= \frac{H\,m}{k - \omega\, m}\end{aligned}`,
    symbols: { s: "member_share", H: "margin_weeks", "ω": "operator_share" },
    legend: "R is the asset's weekly revenue, C its weekly supply cost, m its weekly margin, and θ* the break-even number of weeks.",
    plain: "The document's §7.2 formula is the case where the company pays for supplies. When you pay for your own supplies, they come out of your 80% of revenue, which makes keeping worth less and pushes the break-even point later. Selling treats the price as the weeks of margin paid at purchase plus the operator share afterwards, and ignores equity."
  },
  value: {
    title: "Asset value",
    sections: ["7.4"],
    tex: String.raw`v = m_g \cdot \min\bigl(q,\ \max(0,\ D_g - Q_g)\bigr) \cdot H`,
    symbols: { H: "margin_weeks" },
    legend: "m_g is the margin per unit; q is the asset's weekly output; D_g is weekly demand; Q_g is existing weekly supply.",
    plain: "Only output that meets unmet demand counts. The value is that output's margin over the weeks paid up front. It guides the figure set at approval."
  },
  staged: {
    title: "Staged payment",
    sections: ["7.10", "6.3", "6.4"],
    tex: String.raw`\begin{aligned}\text{At purchase} &= \alpha\, v\\ \text{Points from a payment } P &= \varphi\, P\, m(t_{\text{purchase}})\\ \text{Cash or goods from } P &= (1-\varphi)\, P\end{aligned}`,
    symbols: { "α": "staged_upfront" },
    legend: "P is any payment toward the price: the payment at purchase or an installment. φ is the share the seller chose to take as equity.",
    plain: "The rest of the price is paid in installments out of the margin the asset earns, never more than the price in total. Every payment is split between equity and cash or goods in the proportion the seller chose, and its points always use the multiplier from the purchase date."
  },
  cashlimit: {
    title: "Weekly cash limit",
    sections: ["7.6", "6.9"],
    derived: true,
    tex: String.raw`\text{Room} = L \times \text{Treasury} - \text{Cash already paid this week}`,
    symbols: { L: "cash_limit" },
    plain: "Cash for assets and buybacks in a week is capped. Any excess is paid as equity or queued, unless the board overrides by a supermajority. Reimbursements do not count."
  },
  infra: {
    title: "Weekly infrastructure payment",
    sections: ["7.8"],
    tex: String.raw`\text{Paid}_w = \text{Approved} \times \min\!\left(1,\ \max\!\left(f,\ \frac{R_w}{\bar R}\right)\right)`,
    symbols: { f: "infra_floor" },
    legend: "R_w is this week's company revenue; R̄ is the average of the previous four weeks.",
    plain: "The payment follows company revenue, so the company does not pay a premium during lulls, but it never falls below the floor."
  },
  infra_review: {
    title: "Infrastructure review limit",
    sections: ["7.8"],
    derived: true,
    tex: String.raw`\text{New amount} \ge (1 - c) \times \text{Current amount}`,
    symbols: { c: "infra_max_cut" },
    plain: "At each review the board may raise the payment by any amount, but may cut it by no more than this share. Retiring obsolete infrastructure is separate."
  },
  maint: {
    title: "Maintenance payment",
    sections: ["7.9"],
    tex: String.raw`\text{Payment}_w = \text{Base} \times \min\!\left(1,\ \frac{\text{actual weekly output}}{\text{approved weekly output}}\right)`,
    plain: "An understocked or broken asset is paid less automatically. Producing more than approved does not raise the payment."
  },
  repay: {
    title: "Reimbursement",
    sections: ["10.1", "10.4"],
    tex: String.raw`\text{Repay} = \min\left(p_{\text{paid}},\ p_{\text{cap}}\right)\left(1 + \min\left(c,\ r\,L\right)\right)`,
    symbols: { r: "late_premium", c: "late_cap" },
    legend: "p_cap is the approved maximum unit price times the quantity bought, up to the approved quantity; L is the number of full weeks late.",
    plain: "You are repaid what you paid, never more than the approved cap, plus a premium for each full week the company pays late."
  },
  advance: {
    title: "Challenge window for member advances",
    sections: ["10.2", "9.3"],
    derived: true,
    tex: String.raw`\text{Approval} > t \times \text{Treasury} \;\Rightarrow\; \text{wait for the 24-hour challenge window}`,
    symbols: { t: "advance_threshold" },
    plain: "Large approvals must clear the challenge window before the member spends. Smaller ones may be spent at once."
  },
  netflow: {
    title: "Prunia net-flow test",
    sections: ["11.2"],
    tex: String.raw`N = \text{Taxes} + \text{Pool} - \text{Exchange} \ge 0`,
    plain: "A provisional Home Charter term: what the company pays Prunia in tax plus the Prunian pool share should be at least the exchange compensation Prunia pays the company."
  },
  tax: {
    title: "Signatory sales-tax cut",
    sections: ["11.3"],
    tex: String.raw`r_{\text{new}} = (1 - x)\, r_{\text{old}}`,
    symbols: { x: "tax_cut" },
    plain: "A provisional Stetheros Compact term: the nation cuts its sales tax on company sales by a share of its existing rate."
  },
  discount: {
    title: "Citizen, bulk, and promotional discounts",
    sections: ["11.4", "3.2", "3.7", "4.1"],
    tex: String.raw`\begin{aligned}\text{Buyer pays} &= (1-d)\,(1-b)\,(1-g)\,p\\ \text{Member} &= s \times \text{Buyer pays}\\ \text{Company} &= (1-s) \times \text{Buyer pays}\end{aligned}`,
    symbols: { d: "citizen_discount", b: "bulk_discount", s: "member_share" },
    legend: "p is the list price. d is 0 if the buyer is not a citizen of a partner nation; b is 0 if the order is below the item's bulk quantity; g is the item's approved promotional discount, or 0 if it has none.",
    plain: "Each discount comes off the price in turn, and the 80/20 split is applied to what the buyer pays."
  },
  pool: {
    title: "Nation profit pool",
    sections: ["11.5"],
    tex: String.raw`\begin{aligned}P_r &= \pi\,\max(0,\ \Pi)\, w_r\\ w_r &= \tfrac{1}{2}\,\frac{A_r}{\sum_m A_m} + \tfrac{1}{2}\,\frac{S_r}{\sum_m S_m}\end{aligned}`,
    symbols: { "π": "pool_rate" },
    legend: "A_r is the approved value of active company-owned infrastructure in nation r; S_r is company sales at shops there, after discounts. If either total is zero, the other term carries the full weight.",
    plain: "Each pool nation's payment is the pool times its weight, half by infrastructure and half by sales."
  }
};
