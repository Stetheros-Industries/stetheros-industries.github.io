// Calculator definitions. Each one names the clauses it implements, the formulas
// shown in its "How this is calculated" panel, its inputs, and a compute function.
// Constants come from SI.C (the sheet, or the starting values).
(function () {
  "use strict";
  const { parseNumber: N, parseBool: B } = SI;

  // Input helpers. Defaults are worked examples, mostly from the document.
  const num = (id, label, value, extra) => Object.assign({ id, label, type: "num", value }, extra || {});
  const pct = (id, label, value, extra) => Object.assign({ id, label, type: "pct", value }, extra || {});
  const yn = (id, label, value, extra) => Object.assign({ id, label, type: "yn", value }, extra || {});
  const sel = (id, label, value, options, extra) => Object.assign({ id, label, type: "sel", value, options }, extra || {});

  const R = (label, value, kind, strong) => ({ label, value, kind, strong: !!strong });

  function decayFactor(u, C) {
    const span = C.decay_end - C.decay_start;
    const d = 1 - (1 - C.decay_floor) * Math.max(0, u - C.decay_start) / span;
    return Math.max(C.decay_floor, Math.min(1, d));
  }
  function multiplier(t, C) {
    return 1 + (C.multiplier_start - 1) * Math.max(0, 1 - t / C.multiplier_weeks);
  }
  function median(xs) {
    const a = xs.slice().sort((x, y) => x - y);
    if (!a.length) return NaN;
    const m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }
  function entitlements(V, n, holder, quota) {
    if (n < 1) return { each: NaN, holder: NaN };
    if (!holder) return { each: V / n, holder: null };
    const qh = Math.min(quota, V);
    return { holder: qh, each: n > 1 ? (V - qh) / (n - 1) : 0 };
  }

  window.CALCULATORS = [
    // ---------------- §4 ----------------
    {
      id: "deposit", title: "Payment for a deposit", modes: ["member", "board"],
      sections: ["4.1", "4.2", "4.3", "4.5"], formulas: ["upfront"],
      intro: "What you are paid when you deposit goods and when they sell, including the effect of supply costs.",
      inputs: [
        num("units", "Units deposited", 10),
        num("pref", "Reference price per unit (Cr)", 10, { hint: "Plain average of recent weekly sale prices (§4.4)" }),
        num("price", "Expected sale price per unit (Cr)", 10),
        yn("proven", "Good has proven revenue", "yes"),
        yn("room", "Good is below target stock and within your entitlement", "yes"),
        sel("who", "Who pays for supplies", "member", [["member", "I pay for my own supplies"], ["company", "The company pays (approved supplies)"]]),
        num("cost", "Supply cost per unit (Cr)", 0, { hint: "Enter 0 to leave supplies out" })
      ],
      compute(v, C) {
        const upfrontOK = B(v.proven) && B(v.room);
        const co = v.who === "company", c = v.cost || 0;
        const b = co ? v.price - c : v.price, bref = co ? v.pref - c : v.pref;
        const cut = C.member_share * b * v.units;
        const up = upfrontOK ? Math.max(0, C.upfront_fraction * C.member_share * bref * v.units) : 0;
        const atSale = Math.max(0, cut - up), shortfall = Math.max(0, up - cut);
        const paid = up + atSale, own = co ? 0 : c * v.units;
        const res = [R("Paid at deposit", up, "cr"), R("Paid when the units sell", atSale, "cr")];
        if (own > 0) res.push(R("Paid to you in total", paid, "cr"), R("Your own supply cost", own, "cr"));
        res.push(R(own > 0 ? "Your net after supplies" : "Your total", paid - own, "cr", true));
        res.push(R(shortfall > 0 ? "Company's result (a loss)" : "Company keeps", (1 - C.member_share) * b * v.units - shortfall, "cr"));
        const out = {
          results: res,
          status: upfrontOK
            ? { tone: "good", text: "Up-front payment applies." }
            : { tone: "neutral", text: "Consignment: nothing is paid up front, and the full cut is paid after the goods sell (§4.5)." },
          notes: []
        };
        if (shortfall > 0) out.notes.push(`The sale price is so low that the up-front payment is more than your cut. You keep the up-front payment, nothing more is paid, and the company bears the ${SI.fmt(shortfall, "cr")} difference (§4.3).`);
        if (co && c > 0) out.notes.push("With company-paid supplies the split applies to profit after supplies (§4.2), so this calculator also works out the up-front payment on the reference price less the supply cost. The document does not say this directly.");
        return out;
      }
    },
    {
      id: "proven", title: "Proven revenue check", modes: ["member", "board"],
      sections: ["4.4"], formulas: ["proven"],
      intro: "Whether a good qualifies for up-front payment, and its reference price.",
      inputs: [],
      table: {
        label: "Recent weeks, oldest first: week, units sold, revenue (Cr)",
        columns: ["Week", "Units sold", "Revenue"],
        example: "Week 1, 40, 400\nWeek 2, 0, 0\nWeek 3, 55, 560\nWeek 4, 60, 590"
      },
      compute(v, C, rows) {
        const W = Math.round(C.proven_window), w = Math.round(C.proven_weeks);
        const recent = rows.slice(-W).map(r => ({ units: N(r[1]) || 0, rev: N(r[2]) || 0 }));
        const sold = recent.filter(r => r.units > 0);
        const pref = sold.length ? sold.reduce((a, r) => a + r.rev / r.units, 0) / sold.length : NaN;
        const ok = sold.length >= w && recent.length >= W;
        return {
          results: [
            R("Weeks with sales", `${sold.length} of the last ${recent.length}`),
            R("Reference price per unit", pref, "cr", true)
          ],
          status: ok ? { tone: "good", text: "Proven revenue: up-front payment can apply." }
            : { tone: "warn", text: recent.length < W ? `Enter at least ${W} weeks.` : `Not proven: needs sales in ${w} of the last ${W} weeks. Deposits go on consignment.` },
          notes: ["The reference price is the plain average of each week's average price, counting only weeks with sales."]
        };
      }
    },

    // ---------------- §5 ----------------
    {
      id: "entitle", title: "Your entitlement this week", modes: ["member"],
      sections: ["5.2", "5.3", "5.4"], formulas: ["target", "budget", "entitle", "quota"],
      intro: "How much of a good the company will pay for up front this week, and your share of it.",
      inputs: [
        num("demand", "Expected weekly sales of the good (units)", 60),
        num("stock", "Stock on hand (units)", 30),
        num("n", "Active members", 4),
        yn("holder", "Good has a contract holder", "no"),
        yn("me", "You are the contract holder", "no")
      ],
      compute(v, C) {
        const T = C.cover_weeks * v.demand, V = Math.max(0, T - v.stock);
        const holder = B(v.holder), quota = C.contract_quota * v.demand;
        const e = entitlements(V, v.n, holder, quota);
        const mine = holder && B(v.me) ? e.holder : e.each;
        const res = [R("Target stock", T, "units"), R("Guarantee budget", V, "units")];
        if (holder) res.push(R("Contract holder's quota", quota, "units"), R("Contract holder's entitlement", e.holder, "units"));
        res.push(R("Your entitlement", mine, "units", true));
        return {
          results: res,
          status: V === 0 ? { tone: "warn", text: "Stock is at or above target, so every deposit goes on consignment this week." } : null,
          notes: ["Entitlements still unclaimed 48 hours before the weekly reset move to a shared pool, first come, first served (§5.5). A good has at most one contract holder (§8.1)."]
        };
      }
    },
    {
      id: "supply", title: "Supply plan", modes: ["board"],
      sections: ["5.2", "5.3", "5.4", "8.1"], formulas: ["target", "budget", "quota", "entitle"],
      intro: "Target stock, guarantee budget, and entitlements for every good at once.",
      inputs: [num("n", "Active members", 4)],
      table: {
        label: "One good per line: good, expected weekly sales, stock on hand, contract holder (yes/no)",
        columns: ["Good", "Weekly sales", "Stock", "Contract holder"],
        example: "Refined iron, 60, 30, no\nRedstone components, 100, 80, yes\nCopper sheets, 40, 95, no"
      },
      compute(v, C, rows) {
        const data = rows.map(r => {
          const D = N(r[1]) || 0, S = N(r[2]) || 0, h = B(r[3]);
          const T = C.cover_weeks * D, V = Math.max(0, T - S), quota = C.contract_quota * D;
          const e = entitlements(V, v.n, h, quota);
          return [r[0], T, V, h ? quota : null, h ? e.holder : null, e.each];
        });
        return {
          results: [R("Goods", data.length, "int"), R("Goods at or above target", data.filter(d => d[2] === 0).length, "int")],
          out: {
            columns: ["Good", "Target stock", "Budget", "Holder quota", "Holder entitlement", "Each other member"],
            kinds: [null, "num", "num", "num", "num", "num"],
            rows: data
          },
          notes: ["A budget of zero means every deposit of that good goes on consignment this week."]
        };
      }
    },

    // ---------------- §6 ----------------
    {
      id: "equity", title: "Equity for selling an asset", modes: ["member"],
      sections: ["6.3", "6.4", "7.10"], formulas: ["multiplier", "assetpay", "staged"],
      intro: "The points and cash you receive when the company buys your asset, and when you receive them.",
      inputs: [
        num("value", "Asset's set value (Cr)", 1000, { hint: "Fixed at approval (§7.4)" }),
        num("week", "Weeks since server launch at the date of purchase", 3),
        pct("phi", "Share taken as equity", 50)
      ],
      compute(v, C) {
        const m = multiplier(v.week, C), a = C.staged_upfront;
        return {
          results: [
            R("Multiplier, locked at purchase", m),
            R("Points at purchase", v.phi * a * v.value * m),
            R("Cash or goods at purchase", (1 - v.phi) * a * v.value, "cr"),
            R("Points from later installments", v.phi * (1 - a) * v.value * m),
            R("Cash or goods from later installments", (1 - v.phi) * (1 - a) * v.value, "cr"),
            R("Total points", v.phi * v.value * m, "num", true)
          ],
          notes: ["Installments are paid out of the margin the asset actually earns (§7.10), so the later part arrives only as the asset earns it."]
        };
      }
    },
    {
      id: "asset", title: "Asset purchase", modes: ["board"],
      sections: ["7.4", "7.10", "6.3", "6.4"], formulas: ["value", "staged", "multiplier", "assetpay"],
      intro: "A guide value for an asset with proven goods, how the price is staged, and the seller's points.",
      inputs: [
        num("margin", "Margin per unit (Cr)", 2),
        num("output", "Asset's weekly output (units)", 50),
        num("demand", "Expected weekly demand (units)", 100),
        num("supply", "Existing weekly supply (units)", 70),
        num("week", "Weeks since server launch at the date of purchase", 3),
        pct("phi", "Share the seller takes as equity", 50)
      ],
      compute(v, C) {
        const useful = Math.min(v.output, Math.max(0, v.demand - v.supply));
        const val = v.margin * useful * C.margin_weeks;
        const m = multiplier(v.week, C), a = C.staged_upfront;
        return {
          results: [
            R("Output meeting unmet demand", useful, "units"),
            R("Guide value", val, "cr", true),
            R("At purchase: cash or goods", (1 - v.phi) * a * val, "cr"),
            R("At purchase: equity points", v.phi * a * val * m),
            R("Left to pay from earned margin", (1 - a) * val, "cr"),
            R("Multiplier for every installment", m)
          ],
          notes: [
            "The board fixes the value at approval; this figure only guides it, and only for goods with proven revenue (§7.4).",
            "Check the cash part against the weekly cash limit (§7.6). Use the asset installment calculator for each later payment."
          ]
        };
      }
    },
    {
      id: "install", title: "Asset installment", modes: ["board"],
      sections: ["7.10", "6.3", "6.4"], formulas: ["staged"],
      intro: "How one installment toward a purchased asset splits into points and cash or goods.",
      inputs: [
        num("value", "Asset's set value (Cr)", 1000),
        pct("phi", "Share the seller took as equity", 50),
        num("week", "Weeks since server launch at the date of purchase", 3),
        num("paid", "Paid toward the price so far, including at purchase (Cr)", 500),
        num("inst", "Installment this week, from earned margin (Cr)", 120)
      ],
      compute(v, C) {
        const left = Math.max(0, v.value - v.paid), I = Math.min(Math.max(0, v.inst), left), m = multiplier(v.week, C);
        return {
          results: [
            R("Installment paid", I, "cr"),
            R("Equity points granted", v.phi * I * m, "num", true),
            R("Cash or goods paid", (1 - v.phi) * I, "cr"),
            R("Still owed after this installment", left - I, "cr")
          ],
          status: v.inst > left ? { tone: "warn", text: "The installment was reduced: installments never total more than the price (§7.10)." } : null,
          notes: ["Points use the multiplier from the purchase date, not today's (§7.10). The cash part counts toward the weekly cash limit (§7.6)."]
        };
      }
    },
    {
      id: "divest", title: "Dividend estimate", modes: ["member"],
      sections: ["6.2", "6.5"], formulas: ["share", "dividend"],
      intro: "Your share of a dividend, given profit and the points of active members.",
      inputs: [
        num("profit", "Profit for the period (Cr)", 1000),
        num("mine", "Your equity points", 400),
        num("total", "Total points of all active members", 1000, { hint: "Including yours" }),
        num("n", "Active members", 4),
        yn("active", "You are active", "yes")
      ],
      compute(v, C) {
        const a = B(v.active) ? 1 : 0;
        const share = v.total > 0 ? a * v.mine / v.total : 0;
        const dist = C.dividend_rate * Math.max(0, v.profit);
        const eq = dist * C.dividend_equity_share * share;
        const equal = v.n > 0 ? dist * (1 - C.dividend_equity_share) * a / v.n : 0;
        return {
          results: [
            R("Amount distributed", dist, "cr"),
            R("Your equity share", share, "pct"),
            R("From your equity share", eq, "cr"),
            R("From the equal portion", equal, "cr"),
            R("Your dividend", eq + equal, "cr", true)
          ],
          status: a ? null : { tone: "warn", text: "Inactive members receive no dividend (§6.5)." },
          notes: v.profit <= 0 ? ["With no profit, nothing is distributed."] : []
        };
      }
    },
    {
      id: "divrun", title: "Dividend run", modes: ["board"],
      sections: ["6.2", "6.5", "6.6"], formulas: ["share", "dividend"],
      intro: "Every member's dividend for the period. Paste the member list from the ledger.",
      inputs: [num("profit", "Profit for the period (Cr)", 1000)],
      table: {
        label: "One member per line: name, equity points, active (yes/no)",
        columns: ["Member", "Points", "Active"],
        example: "Alex, 400, yes\nBea, 300, yes\nCy, 200, yes\nDee, 100, yes\nEli, 250, no"
      },
      compute(v, C, rows) {
        const ms = rows.map(r => ({ name: r[0], pts: N(r[1]) || 0, a: B(r[2]) ? 1 : 0 }));
        const n = ms.filter(m => m.a).length;
        const tot = ms.reduce((s, m) => s + m.a * m.pts, 0);
        const dist = C.dividend_rate * Math.max(0, v.profit);
        let paid = 0;
        const data = ms.map(m => {
          const sh = tot > 0 ? m.a * m.pts / tot : 0;
          const eq = dist * C.dividend_equity_share * sh;
          const equal = n > 0 ? dist * (1 - C.dividend_equity_share) * m.a / n : 0;
          paid += eq + equal;
          return [m.name, m.a ? "Yes" : "No", sh, eq, equal, eq + equal];
        });
        return {
          results: [
            R("Active members", n, "int"),
            R("Total active points", tot),
            R("Amount distributed", dist, "cr", true),
            R("Sum of payouts", paid, "cr")
          ],
          out: {
            columns: ["Member", "Active", "Equity share", "Equity part", "Equal part", "Dividend"],
            kinds: [null, null, "pct", "cr", "cr", "cr"],
            rows: data
          },
          notes: [`The dividend and the ${SI.fmt(C.pool_rate, "pct")} nation pool are both calculated on the full profit figure; neither is deducted before the other (§11.5).`]
        };
      }
    },
    {
      id: "activity", title: "Activity test", modes: ["member", "board"],
      sections: ["6.6"], formulas: ["activity"],
      intro: "Whether deposits over the last two weeks keep a member active.",
      inputs: [num("n", "Active members", 4), yn("task", "Completed a company task in the last two weeks", "no"), yn("new", "Joined within the last two weeks", "no")],
      table: {
        label: "One good per line: good, amount deposited in the last two weeks, that good's target stock",
        columns: ["Good", "Deposited", "Target stock"],
        example: "Refined iron, 20, 120\nRedstone components, 10, 200"
      },
      compute(v, C, rows) {
        const sum = rows.reduce((s, r) => { const t = N(r[2]); return s + (t > 0 ? (N(r[1]) || 0) / t : 0); }, 0);
        const need = v.n > 0 ? C.activity_threshold / v.n : NaN;
        const pass = B(v.task) || B(v.new) || sum >= need;
        return {
          results: [R("Your total, as a share of target stock", sum, "pct"), R("Needed", need, "pct"), R("Result", pass ? "Pass" : "Not yet", null, true)],
          status: pass ? { tone: "good", text: B(v.new) ? "A new member counts as active for the first two weeks after joining." : B(v.task) ? "A completed company task passes the test." : "Deposits pass the test." }
            : { tone: "warn", text: "Below the threshold. A member who has not passed for two weeks is inactive." },
          notes: ["Until sales history exists, the board sets a fixed starting amount instead (§6.6).", "A good with no target stock counts only once the CEO or the board sets a target for it (§6.6). Enter that target here."]
        };
      }
    },
    {
      id: "decay", title: "Decay of inactive points", modes: ["member", "board"],
      sections: ["6.8"], formulas: ["decay"],
      intro: "How much of an inactive member's points remain.",
      inputs: [num("pts", "Equity points", 300), num("u", "Weeks since last activity", 9)],
      compute(v, C) {
        const d = decayFactor(v.u, C);
        return {
          results: [R("Share of points kept", d, "pct"), R("Points remaining", d * v.pts, "num", true), R("Points lost on return", (1 - d) * v.pts)],
          notes: ["Lull periods (§6.7) and wartime leave (§12.10) pause the clock. Leave keeps dividends for only its first six weeks."]
        };
      }
    },
    {
      id: "buyback", title: "Buyback when a member leaves", modes: ["member", "board"],
      sections: ["6.9", "6.8"], formulas: ["buyback", "decay"],
      intro: "What the company pays to buy back a departing member's equity.",
      inputs: [num("u", "Weeks since last activity (0 if active)", 0)],
      table: {
        label: "One asset sold to the company per line: asset, set value (Cr), share taken as equity (%)",
        columns: ["Asset", "Set value", "Equity share"],
        example: "Iron smelter, 1000, 50%\nWheat farm, 400, 100%"
      },
      compute(v, C, rows) {
        const base = rows.reduce((s, r) => { let f = N(r[2]); if (f > 1) f = f / 100; return s + (N(r[1]) || 0) * (isNaN(f) ? 0 : f); }, 0);
        const d = decayFactor(v.u, C);
        return {
          results: [R("Original equity value", base, "cr"), R("Decay factor", d, "pct"), R("Buyback", d * base, "cr", true)],
          notes: [
            "Payment may be in goods (at the internal price), money, or other agreed terms. It counts toward the weekly cash limit, and any excess is paid in later installments (§7.6).",
            "A member on wartime leave is bought back, with no decay, only on formally leaving or not returning within two weeks after the war ends; enter 0 weeks (§12.10).",
            "A member removed for wrongdoing receives a reduced buyback (§9.8, §9.9)."
          ]
        };
      }
    },

    // ---------------- §7 ----------------
    {
      id: "keepsell", title: "Keep or sell an asset", modes: ["member"],
      sections: ["7.2", "4.2"], formulas: ["keepsell", "keepsell_totals"],
      intro: "When keeping an asset pays more in cash than selling it to the company, including supply costs.",
      inputs: [
        num("rev", "Asset's weekly revenue (Cr)", 100),
        num("cost", "Weekly supply cost (Cr)", 40),
        sel("who", "If you keep it, who pays for supplies", "company", [["company", "The company (approved supplies)"], ["member", "I do"]]),
        num("weeks", "Weeks you expect it to run", 10)
      ],
      compute(v, C) {
        const m = v.rev - v.cost;
        const k = v.who === "member" ? C.member_share * v.rev - v.cost : C.member_share * m;
        const keep = k * v.weeks, sell = C.margin_weeks * m + C.operator_share * m * v.weeks;
        const denom = k - C.operator_share * m;
        const be = denom > 0 ? C.margin_weeks * m / denom : Infinity;
        return {
          results: [
            R("Your weekly earnings if you keep it", k, "cr"),
            R("Break-even", isFinite(be) ? be : "Never", isFinite(be) ? "wk" : null),
            R("Cash from keeping", keep, "cr"),
            R("Cash from selling", sell, "cr"),
            R("Better on cash", keep > sell ? "Keep" : keep < sell ? "Sell" : "Equal", null, true)
          ],
          notes: ["This compares cash only. Taking equity, the early multiplier, and freeing capital for the next build are reasons to sell (§7.2). With the company paying supplies, the break-even matches the document's §7.2 formula."]
        };
      }
    },
    {
      id: "cash", title: "Weekly cash limit", modes: ["board"],
      sections: ["7.6"], formulas: ["cashlimit"],
      intro: "Whether a cash payment for an asset or buyback fits this week's limit.",
      inputs: [num("treasury", "Treasury balance (Cr)", 10000), num("paid", "Cash already paid this week for assets and buybacks (Cr)", 1000), num("proposed", "Proposed cash payment (Cr)", 2000)],
      compute(v, C) {
        const lim = C.cash_limit * v.treasury, room = Math.max(0, lim - v.paid), excess = Math.max(0, v.proposed - room);
        return {
          results: [R("Weekly limit", lim, "cr"), R("Room left this week", room, "cr"), R("Excess", excess, "cr", true)],
          status: excess > 0 ? { tone: "warn", text: `Over the limit. Pay the excess as equity or queue it, unless the board approves more by ${SI.fmt(C.board_supermajority, "pct")}.` } : { tone: "good", text: "Within the limit." },
          notes: ["Reimbursements for member advances do not count toward the limit (§10.3)."]
        };
      }
    },
    {
      id: "infra", title: "Infrastructure payment", modes: ["board"],
      sections: ["7.8"], formulas: ["infra", "infra_review"],
      intro: "This week's payment to an infrastructure builder, and whether a review change is allowed.",
      inputs: [
        num("approved", "Approved weekly payment (Cr)", 100),
        num("rw", "Company revenue this week (Cr)", 600),
        num("ravg", "Average weekly revenue, previous four weeks (Cr)", 1000),
        num("proposed", "Proposed new amount at review (Cr)", 70, { hint: "Leave equal to the approved amount if no review" })
      ],
      compute(v, C) {
        const ratio = v.ravg > 0 ? v.rw / v.ravg : 1;
        const factor = Math.min(1, Math.max(C.infra_floor, ratio));
        const minAllowed = (1 - C.infra_max_cut) * v.approved;
        const ok = v.proposed >= minAllowed;
        return {
          results: [R("Scaling factor", factor, "pct"), R("Paid this week", v.approved * factor, "cr", true), R("Lowest amount a review may set", minAllowed, "cr")],
          status: ok ? { tone: "good", text: "The proposed amount is within the review limit." }
            : { tone: "bad", text: `A review may cut the payment by at most ${SI.fmt(C.infra_max_cut, "pct")}. Retiring obsolete infrastructure is a separate decision.` },
          notes: [`Review changes need a ${SI.fmt(C.board_supermajority, "pct")} board vote, and the builder does not vote.`]
        };
      }
    },
    {
      id: "maint", title: "Maintenance payment", modes: ["board"],
      sections: ["7.9"], formulas: ["maint"],
      intro: "The weekly maintenance payment for an asset, scaled by its output.",
      inputs: [num("base", "Base weekly payment (Cr)", 50), num("approved", "Approved weekly output", 100), num("actual", "Actual weekly output", 80)],
      compute(v, C) {
        const f = v.approved > 0 ? Math.min(1, v.actual / v.approved) : NaN;
        return { results: [R("Output factor", f, "pct"), R("Payment", v.base * f, "cr", true)], notes: ["Rails, storage, and defense have no output to measure; the CEO or board confirms each week that they work."] };
      }
    },

    // ---------------- §10 ----------------
    {
      id: "advance", title: "Member advance check", modes: ["board"],
      sections: ["10.2"], formulas: ["advance"],
      intro: "Whether an approval for a member-advanced purchase must clear the challenge window first.",
      inputs: [num("treasury", "Treasury balance (Cr)", 10000), num("approval", "Approved amount (Cr)", 1500)],
      compute(v, C) {
        const t = C.advance_threshold * v.treasury, wait = v.approval > t;
        return {
          results: [R("Threshold", t, "cr"), R("Result", wait ? "Wait 24 hours" : "May spend now", null, true)],
          status: wait ? { tone: "warn", text: "Above the threshold: the approval goes through the 24-hour challenge window before the member spends (§9.3)." } : { tone: "good", text: "Below the threshold: the member may spend immediately." }
        };
      }
    },
    {
      id: "repay", title: "Reimbursement", modes: ["member", "board"],
      sections: ["10.1", "10.4"], formulas: ["repay"],
      intro: "What a member is repaid for an approved purchase made with personal money.",
      inputs: [
        num("paid", "Amount you paid (Cr)", 900),
        num("unit", "Approved maximum unit price (Cr)", 10),
        num("qty", "Quantity bought", 100),
        num("aqty", "Approved maximum quantity", 100),
        num("late", "Full weeks late after the 7-day window", 2)
      ],
      compute(v, C) {
        const cap = v.unit * Math.min(v.qty, v.aqty), base = Math.min(v.paid, cap);
        const prem = Math.min(C.late_cap, C.late_premium * Math.max(0, Math.floor(v.late)));
        return {
          results: [R("Approved cap", cap, "cr"), R("Repaid before premium", base, "cr"), R("Late premium", prem, "pct"), R("Total repayment", base * (1 + prem), "cr", true)],
          notes: [`The window is ${SI.fmt(C.reimb_days)} days from when the goods are recorded in company storage (§10.1). An inflated or false claim is a severe offense (§10.5).`]
        };
      }
    },

    // ---------------- §11 ----------------
    {
      id: "netflow", title: "Prunia net-flow test", modes: ["board", "government"],
      sections: ["11.2"], formulas: ["netflow"],
      intro: "The provisional Home Charter test of what Prunia's treasury receives against what it pays.",
      inputs: [num("taxes", "Taxes paid to Prunia (Cr)", 100), num("pool", "Prunia's pool share (Cr)", 150), num("ex", "Exchange compensation paid by Prunia (Cr)", 40)],
      compute(v) {
        const n = v.taxes + v.pool - v.ex;
        return { results: [R("Net flow to Prunia", n, "cr", true)], status: n >= 0 ? { tone: "good", text: "The test passes." } : { tone: "bad", text: "The test fails." } };
      }
    },
    {
      id: "tax", title: "Signatory sales tax", modes: ["board", "government"],
      sections: ["11.3"], formulas: ["tax"],
      intro: "The sales-tax rate a signatory nation applies to company sales under the Economic Plan.",
      inputs: [pct("rate", "Nation's existing sales-tax rate", 10)],
      compute(v, C) { return { results: [R("New rate", (1 - C.tax_cut) * v.rate, "pct", true)] }; }
    },
    {
      id: "discount", title: "Discounted sale", modes: ["member", "board", "government"],
      sections: ["11.4", "3.2", "4.1"], formulas: ["discount"],
      intro: "How the citizen and bulk discounts are shared when a member's goods sell at a discount.",
      inputs: [num("price", "List price per unit (Cr)", 100), num("units", "Units", 1),
        yn("citizen", "Buyer is a citizen or government of a Home Charter or Economic Plan nation", "yes"),
        yn("bulk", "Order meets the item's bulk quantity", "no")],
      compute(v, C) {
        const d = B(v.citizen) ? C.citizen_discount : 0, b = B(v.bulk) ? C.bulk_discount : 0;
        const paid = (1 - d) * (1 - b) * v.price * v.units;
        return { results: [R("Combined discount", 1 - (1 - d) * (1 - b), "pct"), R("Buyer pays", paid, "cr"), R("Member receives", C.member_share * paid, "cr", true), R("Company keeps", (1 - C.member_share) * paid, "cr")], notes: ["The discounts are applied one after the other, and the 80/20 split applies to the discounted price (§4.1). On goods the company produces itself, the company bears the whole discount."] };
      }
    },
    {
      id: "pool", title: "Nation profit pool", modes: ["board", "government"],
      sections: ["11.5", "12.7"], formulas: ["pool"],
      intro: "Each pool nation's payment for the period.",
      inputs: [num("profit", "Company profit for the period (Cr)", 1000)],
      table: {
        label: "One pool nation per line: nation, value of active company-owned infrastructure there (Cr), company sales at shops there (Cr)",
        columns: ["Nation", "Infrastructure value", "Sales"],
        example: "Prunia, 800, 700\nSecond nation, 200, 300"
      },
      compute(v, C, rows) {
        const ns = rows.map(r => ({ name: r[0], a: N(r[1]) || 0, s: N(r[2]) || 0 }));
        const A = ns.reduce((x, n) => x + n.a, 0), S = ns.reduce((x, n) => x + n.s, 0);
        const pool = C.pool_rate * Math.max(0, v.profit);
        const data = ns.map(n => {
          let w;
          if (A > 0 && S > 0) w = 0.5 * n.a / A + 0.5 * n.s / S;
          else if (A > 0) w = n.a / A;
          else if (S > 0) w = n.s / S;
          else w = NaN;
          return [n.name, w, pool * w];
        });
        return {
          results: [R("Pool", pool, "cr", true), R("Pool nations", ns.length, "int")],
          out: { columns: ["Nation", "Weight", "Payment"], kinds: [null, "pct", "cr"], rows: data },
          notes: ["During a war, payments to a belligerent signatory are held in escrow (§12.7)."]
        };
      }
    },
    {
      id: "resale", title: "Resale review", modes: ["board", "government"],
      sections: ["11.6"], formulas: ["resale"],
      intro: "Which buyers' discounted purchases are high enough for the auditor to review.",
      inputs: [],
      table: {
        label: "One buyer per line: buyer, nation, discounted purchases over the last four weeks (Cr)",
        columns: ["Buyer", "Nation", "Purchases"],
        example: "Ana, Prunia, 200\nBo, Prunia, 180\nCal, Prunia, 1250\nDara, Prunia, 220\nEnzo, Second nation, 90\nFay, Second nation, 110"
      },
      compute(v, C, rows) {
        const bs = rows.map(r => ({ name: r[0], nation: r[1] || "", x: N(r[2]) || 0 }));
        const by = {};
        bs.forEach(b => (by[b.nation] = by[b.nation] || []).push(b.x));
        const med = {};
        Object.keys(by).forEach(k => (med[k] = median(by[k])));
        const data = bs.map(b => [b.name, b.nation, b.x, med[b.nation], b.x > C.resale_multiple * med[b.nation] ? "Review" : ""]);
        return {
          results: [R("Buyers flagged", data.filter(d => d[4]).length, "int", true)],
          out: { columns: ["Buyer", "Nation", "Purchases", "Nation median", "Flag"], kinds: [null, null, "cr", "cr", null], rows: data },
          notes: ["A median from only a few buyers is unreliable. A review is a question about intended use, not a finding of resale."]
        };
      }
    }
  ];
})();
