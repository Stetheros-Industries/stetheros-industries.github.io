// Formulas exactly as they appear in the policy document, keyed by clause number.
// The policy page shows these in place of the formula images, which the Markdown export drops.
// Edit only if a formula in the document itself changes.
window.DOC_FORMULAS = {
  "4.3": "\\begin{aligned}\n\\text{Up-front} &= 0.2 \\times 0.8 \\times p_{\\text{ref}}\\\\\n\\text{At sale} &= 0.8\\,p - \\text{Up-front}\\\\\n\\text{Company} &= 0.2\\,p\n\\end{aligned}",
  "5.2": "T_g = \\tau\\, D_g, \\qquad \\tau = 2",
  "5.3": "V_g = \\max\\bigl(0,\\ \\tau D_g - S_g\\bigr)",
  "5.4": "\\begin{aligned}\nq_{i,g} &= \\frac{V_g}{n} && \\text{(good } g \\text{ has no contract holder)}\\\\\nq_{h,g} &= \\min(c_g,\\ V_g) && \\text{(the contract holder } h\\text{)}\\\\\nq_{i,g} &= \\frac{V_g - q_{h,g}}{n-1} && \\text{(every other member, when there is a holder)}\n\\end{aligned}",
  "6.2": "s_i = \\frac{a_i\\, E_i}{\\sum_j a_j\\, E_j}",
  "6.3": "m(t) = 1 + 0.5\\,\\max\\!\\left(0,\\ 1 - \\frac{t}{6}\\right)",
  "6.4": "E = \\varphi\\, v\\, m(t), \\qquad \\text{cash or goods} = (1-\\varphi)\\, v",
  "6.5": "D_i = \\rho\\, \\Pi \\left(0.85\\, s_i + \\frac{0.15\\, a_i}{n}\\right), \\qquad \\rho = 0.25 \\text{ at launch}",
  "6.6": "\\sum_g \\frac{x_{i,g}}{T_g} \\ge \\frac{0.5}{n}",
  "6.8": "d(u) = \\max\\!\\left(0.5,\\ 1 - 0.5\\,\\frac{\\max(0,\\ u - 6)}{6}\\right)",
  "6.9": "\\text{Buyback} = d \\cdot \\sum_k \\varphi_k\\, v_k",
  "7.2": "\\theta > \\frac{H}{0.8 - \\omega}",
  "7.4": "v = m_g \\cdot \\min\\bigl(q,\\ \\max(0,\\ D_g - Q_g)\\bigr) \\cdot H, \\qquad H = 4",
  "7.8": "\\text{Paid}_w = \\text{Approved} \\times \\min\\!\\left(1,\\ \\max\\!\\left(f,\\ \\frac{R_w}{\\bar R}\\right)\\right), \\qquad f = 0.5",
  "7.9": "\\text{Payment}_w = \\text{Base} \\times \\min\\!\\left(1,\\ \\frac{\\text{actual weekly output}}{\\text{approved weekly output}}\\right)",
  "7.10": "\\text{At purchase} = \\alpha\\, v, \\qquad \\alpha = 0.5",
  "8.1": "c_g = \\kappa\\, D_g, \\qquad \\kappa = 0.5 \\text{ to start}",
  "10.4": "\\text{Repay} = \\min\\left(p_{\\text{paid}},\\ p_{\\text{cap}}\\right)\\left(1 + \\min\\left(0.3,\\ 0.1\\,L\\right)\\right)",
  "11.2": "N = \\text{Taxes} + \\text{Pool} - \\text{Exchange} \\ge 0",
  "11.3": "r_{\\text{new}} = 0.8\\; r_{\\text{old}}",
  "11.4": "\\begin{aligned}\n\\text{Member} &= 0.8\\,(1-d)\\,p\\\\\n\\text{Company} &= 0.2\\,(1-d)\\,p, \\qquad d = 0.10\n\\end{aligned}",
  "11.5": "\\begin{aligned}\nP_r &= 0.07\\,\\max(0,\\ \\Pi)\\, w_r\\\\\nw_r &= \\frac{1}{2}\\,\\frac{A_r}{\\sum_m A_m} + \\frac{1}{2}\\,\\frac{S_r}{\\sum_m S_m}\n\\end{aligned}"
};
