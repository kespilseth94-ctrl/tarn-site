// Risk scoring engine — ported from the Tarn/VerifiHouse Streamlit app's
// analyze_history(). Keep this in sync with app.py's National Risk
// Dictionary; sources are public federal/state law (NEC, IRC, HUD, CPSC,
// Cox v Shell settlement, revisor.mn.gov) — factual/legal content.

import type { Permit } from "./minnetonka";

export interface Finding {
  cat: string;
  msg: string;
  type: "risk";
}

interface KeywordRule {
  k: string[];
  d: number;
  c: string;
  m: string;
}

const KEYWORD_RISKS: KeywordRule[] = [
  { k: ["KNOB", "TUBE"], d: 25, c: "fire", m: "Major Electrical Risk: Knob & Tube Wiring." },
  { k: ["ALUMINUM WIRING"], d: 15, c: "fire", m: "Fire Risk: Aluminum branch wiring." },
  { k: ["UNPERMITTED", "ILLEGAL WIRING"], d: 20, c: "legal", m: "Compliance Risk: Unpermitted work." },
  { k: ["UNDERPIN", "SHORING", "FOUNDATION"], d: 30, c: "structure", m: "Structural Risk: Foundation movement." },
  { k: ["SISTERING", "JOIST", "TERMITE"], d: 15, c: "structure", m: "Structural Decay: Frame damage/rot." },
  { k: ["FIRE DAMAGE", "CHARRED", "BURNING"], d: 30, c: "fire", m: "Structural Risk: Past fire evidence." },
  { k: ["WATER DAMAGE", "MOLD", "FUNGAL"], d: 20, c: "water", m: "Health Risk: Water intrusion/mold." },
  { k: ["REMEDIATION", "ASBESTOS", "LEAD"], d: 10, c: "health", m: "Toxic Material: Hazmat remediation." },
  { k: ["NOV ", "NOTICE OF VIOLATION"], d: 25, c: "legal", m: "Legal Risk: City Violations found." },
  { k: ["SOLAR", "LEASE", "PPA"], d: 15, c: "finance", m: "Financial Encumbrance: Solar Lease." },
];

// ── MN Code Timeline — Minneapolis-specific safety-gap layer ──────────────
// Source: public Minnesota law (MN Rule 1309 / 4714, MN Statute 299F.50,
// revisor.mn.gov) — freely reproducible factual/legal content. Ported from
// app.py's MN_CODE_TIMELINE + _run_mn_code_timeline(). Runs in addition to
// (not instead of) the National Risk Dictionary below, matching app.py's
// own execution order for Minneapolis, MN.
interface MnCodeTimelineEntry {
  id: string;
  system: string;
  cutoffYear: number;
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
  remediationKw: string[];
  gapKw: string[];
  codeRef: string;
  yearRange?: [number, number];
  msg: string;
}

const MN_CODE_TIMELINE: MnCodeTimelineEntry[] = [
  {
    id: "elec_knob_tube",
    system: "electrical",
    cutoffYear: 1950,
    riskLevel: "HIGH",
    remediationKw: ["REWIRE", "KNOB AND TUBE", "K&T", "REPLACE WIRING", "FULL REWIRE", "WIRING REPLACEMENT"],
    gapKw: [],
    codeRef: "NEC Art. 394; MN Rule 1315",
    msg: "Home built before 1950 — no rewiring permit found. Likely original knob-and-tube wiring. Incompatible with modern insulation; MN insurers increasingly declining coverage. Full rewire est. $15k–$40k.",
  },
  {
    id: "elec_aluminum",
    system: "electrical",
    cutoffYear: 1973,
    riskLevel: "HIGH",
    remediationKw: ["ALUMINUM WIRING", "AL WIRING", "CO/ALR", "PIGTAIL", "WIRE NUT", "COPPER PIGTAIL"],
    gapKw: [],
    codeRef: "NEC 310.106; MN Rule 1315",
    yearRange: [1965, 1973],
    msg: "Home built 1965–1973 — aluminum branch wiring era. Fire risk at connections over time. Requires CO/ALR outlets or full replacement. Est. $3k–$20k.",
  },
  {
    id: "elec_afci_bedrooms",
    system: "electrical",
    cutoffYear: 2002,
    riskLevel: "MEDIUM",
    remediationKw: ["AFCI", "ARC FAULT", "ARC-FAULT", "PANEL UPGRADE", "BREAKER REPLACEMENT"],
    gapKw: [],
    codeRef: "NEC 210.12 (1999 ed.); MN effective Jan 1 2002; dli.mn.gov",
    msg: "Home built before 2002 — bedroom circuits may lack AFCI protection (required by MN since 2002). AFCI breakers detect arc faults before fires start. Upgrade est. $800–$3k.",
  },
  {
    id: "elec_afci_whole_home",
    system: "electrical",
    cutoffYear: 2012,
    riskLevel: "MEDIUM",
    remediationKw: ["AFCI", "ARC FAULT", "PANEL UPGRADE", "WHOLE HOUSE AFCI"],
    gapKw: [],
    codeRef: "NEC 210.12 (2011 ed.); MN Rule 1315",
    msg: "Home built before 2012 — AFCI may cover bedrooms only, not all habitable rooms (required by current MN code). Full AFCI upgrade est. $2k–$6k.",
  },
  {
    id: "elec_gfci",
    system: "electrical",
    cutoffYear: 1975,
    riskLevel: "MEDIUM",
    remediationKw: ["GFCI", "GROUND FAULT", "GFI", "RECEPTACLE REPLACEMENT"],
    gapKw: [],
    codeRef: "NEC 210.8 (multiple eds.); MN Rule 1315",
    msg: "Home built before 1975 — may lack GFCI protection in bathrooms, kitchen, garage, and outdoor locations. Required progressively from 1975 (bathrooms) through 1990s. Upgrade est. $500–$2.5k.",
  },
  {
    id: "elec_fed_pacific",
    system: "electrical",
    cutoffYear: 1990,
    riskLevel: "HIGH",
    remediationKw: ["FPE", "STAB-LOK", "STAB LOK", "ZINSCO", "PANEL REPLACEMENT", "MAIN PANEL", "SERVICE PANEL"],
    gapKw: ["PANEL", "MAIN PANEL", "SERVICE PANEL"],
    codeRef: "CPSC advisory; MN Rule 1315",
    msg: "Panel permit found — verify original panel was not FPE Stab-Lok or Zinsco (common 1950–1990). Documented breaker failure rates; many MN insurers declining coverage. Replacement est. $2.5k–$6k.",
  },
  {
    id: "struct_deck_lateral",
    system: "structure",
    cutoffYear: 2015,
    riskLevel: "HIGH",
    remediationKw: ["DECK", "PORCH", "BALCONY", "DECK REPAIR", "DECK REBUILD", "LATERAL LOAD"],
    gapKw: ["DECK", "PORCH", "BALCONY"],
    codeRef: "MRC R507.1, R507.2.3; MN Rule 1309 (2015 IRC); revisor.mn.gov 1309.0507",
    msg: "Deck permit predates 2015 MN code requiring lateral load anchoring (MRC R507). Pre-2015 decks attached with nails only — insufficient lateral resistance. 90% of deck collapses involve ledger failure. Rebuild est. $8k–$20k.",
  },
  {
    id: "struct_egress",
    system: "structure",
    cutoffYear: 1990,
    riskLevel: "HIGH",
    remediationKw: ["EGRESS", "EGRESS WINDOW", "WINDOW WELL", "EGRESS OPENING"],
    gapKw: [],
    codeRef: "IRC R310; MN Rule 1309",
    msg: "Home pre-1990 listed with basement bedrooms — no egress window permit found. Pre-code basement bedrooms may be illegal and uninsurable as sleeping rooms. Egress window installation est. $3k–$8k per opening.",
  },
  {
    id: "struct_stucco_eifs",
    system: "structure",
    cutoffYear: 2003,
    riskLevel: "HIGH",
    remediationKw: ["STUCCO", "EIFS", "RESIDE", "RE-SIDE", "MOISTURE BARRIER", "WATER MANAGEMENT", "DRAINAGE PLANE", "SYNTHETIC STUCCO"],
    gapKw: ["STUCCO", "EIFS"],
    codeRef: "IRC R703; MN Rule 1309; MN moisture barrier amendments (post-Woodbury 2002)",
    msg: "EIFS/stucco permit found predating 2003 MN moisture barrier requirements. Post-Woodbury (2002), MN code requires drainage plane — pre-code EIFS traps moisture causing concealed rot. MN insurers increasingly declining. Est. $15k–$60k.",
  },
  {
    id: "plumb_polybutylene",
    system: "plumbing",
    cutoffYear: 1996,
    riskLevel: "HIGH",
    remediationKw: ["POLYBUTYLENE", "PB PIPE", "QUEST PIPE", "REPIPE", "REPLACE WATER LINES"],
    gapKw: [],
    codeRef: "Cox v. Shell Oil 1995 settlement; MN Rule 4714",
    yearRange: [1978, 1995],
    msg: "Home built 1978–1995 — no repipe permit found. May contain polybutylene (PB) water pipe. Subject to fitting failure; most MN insurers require documented replacement. Full repipe est. $4k–$15k.",
  },
  {
    id: "plumb_galvanized",
    system: "plumbing",
    cutoffYear: 1960,
    riskLevel: "MEDIUM",
    remediationKw: ["REPIPE", "COPPER", "PEX", "WATER LINE", "SUPPLY LINE", "REPLACE PIPE"],
    gapKw: [],
    codeRef: "UPC 604.1; MN Rule 4714",
    msg: "Home built before 1960 — no repipe permit. Likely original galvanized steel supply lines. Galvanized corrodes internally, reducing flow and eventually failing. At or past 50–70 year lifespan. Repipe est. $5k–$18k.",
  },
  {
    id: "plumb_sewer",
    system: "plumbing",
    cutoffYear: 1980,
    riskLevel: "HIGH",
    remediationKw: ["SEWER LATERAL", "SEWER LINE", "CLAY TILE", "SEWER REPAIR", "LATERAL REPLACEMENT"],
    gapKw: [],
    codeRef: "MN Rule 4714; Twin Cities municipal sewer compliance programs",
    msg: "Home built before 1980 — likely clay tile or Orangeburg sewer lateral. Many Twin Cities municipalities require point-of-sale sewer compliance inspection. Replacement est. $5k–$25k.",
  },
  {
    id: "plumb_septic",
    system: "plumbing",
    cutoffYear: 9999,
    riskLevel: "HIGH",
    remediationKw: ["SEPTIC COMPLIANCE", "MOUND SYSTEM REPAIR", "DRAINFIELD REPAIR"],
    gapKw: ["SEPTIC", "ISTS", "DRAINFIELD", "MOUND SYSTEM"],
    codeRef: "MN Rule 7080; MN Statute 115.55 (revisor.mn.gov)",
    msg: "Property has septic system. MN law (Rule 7080) requires compliance inspection at sale and pump-out every 3 years. Failed compliance = no mortgage closing. Replacement est. $3k–$40k depending on system type.",
  },
  {
    id: "roof_ice_barrier",
    system: "roofing",
    cutoffYear: 2000,
    riskLevel: "MEDIUM",
    remediationKw: ["ICE BARRIER", "ICE AND WATER", "ICE SHIELD", "REROOF", "ROOF REPLACEMENT"],
    gapKw: ["ROOF", "REROOF", "SHINGLE"],
    codeRef: "IRC R905.2.7.1; MN Rule 1309; MN climate zone 6",
    msg: "Roof permit predates 2000 — ice barrier membrane at eaves may be absent. Required in MN (Climate Zone 6) by IRC R905.2.7. Prevents water infiltration from ice dams. Added cost at reroofing: $500–$2k.",
  },
  {
    id: "hvac_co_detector",
    system: "hvac",
    cutoffYear: 2009,
    riskLevel: "LOW",
    remediationKw: ["CO DETECTOR", "CARBON MONOXIDE", "CO ALARM"],
    gapKw: [],
    codeRef: "MN Statute 299F.50; IRC R315",
    msg: "Home built before 2009 with fuel appliances — verify CO detector installation. Required by MN Statute 299F.50 since August 2009. Inexpensive ($30–$100/detector) but required for MN home sale.",
  },
];

function mnDeductionFor(risk: "HIGH" | "MEDIUM" | "LOW"): number {
  return { HIGH: 20, MEDIUM: 12, LOW: 4 }[risk] ?? 10;
}

// Evaluates every MN Code Timeline entry against the property's permit
// history using three modes: (1) skip if a remediation-keyword permit is
// found, (2) confirmed "Safety Gap" if a gap-keyword permit predates the
// cutoff year, (3) year-based partial-deduction inference using yearBuilt
// (falling back to the earliest permit year) when no gap keywords apply and
// the entry is HIGH risk. Also flags expired Minneapolis permits separately.
function runMnCodeTimeline(
  permits: Permit[],
  score: number,
  log: Finding[],
  yearBuilt: number | null
): number {
  const allDesc = permits.map((p) => String(p.description || "").toUpperCase()).join(" ");

  const permitYears: number[] = [];
  for (const p of permits) {
    const yr = parseInt(String(p.permit_creation_date || "9999").slice(0, 4), 10);
    if (!Number.isNaN(yr)) permitYears.push(yr);
  }
  const earliestPermitYr = permitYears.length > 0 ? Math.min(...permitYears) : 9999;
  const refYear = yearBuilt && yearBuilt > 1800 ? yearBuilt : earliestPermitYr;

  for (const entry of MN_CODE_TIMELINE) {
    const deduction = mnDeductionFor(entry.riskLevel);
    const remediated = entry.remediationKw.some((kw) => allDesc.includes(kw));

    if (entry.cutoffYear === 9999) {
      if (entry.id === "plumb_septic") {
        if (entry.gapKw.some((kw) => allDesc.includes(kw)) && !remediated) {
          score -= deduction;
          log.push({ cat: entry.system, msg: `${entry.msg} [${entry.codeRef}]`, type: "risk" });
        }
      }
      continue;
    }

    if (remediated) continue;

    if (entry.yearRange) {
      const [lo, hi] = entry.yearRange;
      if (!(lo <= refYear && refYear <= hi)) continue;
    }

    let gapConfirmed = false;
    let gapYr: number | null = null;
    if (entry.gapKw.length > 0) {
      for (const p of permits) {
        const desc = String(p.description || "").toUpperCase();
        if (entry.gapKw.some((kw) => desc.includes(kw))) {
          const yr = parseInt(String(p.permit_creation_date || "9999").slice(0, 4), 10);
          if (!Number.isNaN(yr) && yr < entry.cutoffYear) {
            gapConfirmed = true;
            gapYr = yr;
            break;
          }
        }
      }
    }

    if (gapConfirmed) {
      score -= deduction;
      log.push({
        cat: entry.system,
        msg: `Safety Gap (${gapYr}): ${entry.msg} [${entry.codeRef}]`,
        type: "risk",
      });
    } else if (refYear < entry.cutoffYear && entry.gapKw.length === 0) {
      if (entry.riskLevel === "HIGH") {
        const partial = Math.max(Math.floor(deduction / 2), 4);
        score -= partial;
        log.push({
          cat: entry.system,
          msg: `Potential Gap: ${entry.msg} [${entry.codeRef}]`,
          type: "risk",
        });
      }
    }
  }

  // Expired permit flag (Minneapolis-specific).
  const expired = permits.filter((p) => String(p.status || "").toUpperCase() === "EXPIRED");
  if (expired.length > 0) {
    score -= 10;
    for (const ep of expired) {
      const descShort = String(ep.description || "Unknown work").slice(0, 60);
      log.push({
        cat: "legal",
        msg: `Expired Permit: '${descShort}' — work done but final inspection never completed.`,
        type: "risk",
      });
    }
  }

  return score;
}

export function analyzeHistory(
  permits: Permit[],
  cityName = "",
  yearBuilt?: number | null
): { score: number; findings: Finding[] } {
  let score = 100;
  const log: Finding[] = [];

  for (const p of permits) {
    const desc = String(p.description || "").toUpperCase();
    const date = (p.permit_creation_date || "N/A").slice(0, 4);
    for (const r of KEYWORD_RISKS) {
      if (r.k.some((k) => desc.includes(k))) {
        if (desc.includes("BURNING") && desc.includes("STOVE")) continue;
        score -= r.d;
        log.push({ cat: r.c, msg: `${r.m} (${date})`, type: "risk" });
      }
    }
  }

  // MN Code Timeline (state-code safety-gap layer) — Minneapolis-specific,
  // per app.py's own execution order (runs before the National Risk
  // Dictionary, which then applies unconditionally to every city below).
  if (cityName === "Minneapolis, MN") {
    score = runMnCodeTimeline(permits, score, log, yearBuilt ?? null);
  }

  // ── National Risk Dictionary — applies to all cities ──────────────────
  const buildYr = yearBuilt && yearBuilt > 1800 ? yearBuilt : null;
  const allDescs = permits
    .map((p) => String(p.description || "").toUpperCase())
    .join(" ");

  if (buildYr && buildYr < 1978) {
    if (!["ABATEMENT", "LEAD REMOV", "FULL GUT"].some((k) => allDescs.includes(k))) {
      score -= 8;
      log.push({
        cat: "health",
        msg: `Health Risk: Home built ${buildYr} — HUD Title X (1978) presumes lead-based paint present. Physical inspection and testing recommended. [HUD Title X; CPSC]`,
        type: "risk",
      });
    }
  }

  if (buildYr && buildYr >= 1978 && buildYr <= 1995) {
    if (
      !["REPIPE", "PB PIPE", "POLYBUTYLENE", "QUEST PIPE", "WATER LINE REPLAC", "REPLACE WATER"].some(
        (k) => allDescs.includes(k)
      )
    ) {
      score -= 15;
      log.push({
        cat: "plumbing",
        msg: `Critical Plumbing Risk: Home built ${buildYr} — polybutylene (PB) pipe likely present. Class-action defect (Cox v Shell 1995); brittle failure at fittings without warning. FHA/MN insurer may require documented replacement. Repipe est. $4k–$15k. [Cox v. Shell Oil 1995; IRC P2906]`,
        type: "risk",
      });
    }
  }

  if (buildYr && buildYr < 1990) {
    if (
      !["PANEL", "ELECTRICAL SERVICE", "200 AMP", "SERVICE UPGRADE", "PANEL REPLACE"].some((k) =>
        allDescs.includes(k)
      )
    ) {
      score -= 15;
      log.push({
        cat: "electrical",
        msg: `Fire Risk: Home built ${buildYr} — electrical panel upgrade not on record. Pre-1990 homes may contain Federal Pacific (FPE Stab-Lok) or Zinsco panels — documented breaker failure rates; many insurers declining coverage. Verify panel brand at inspection. Replacement est. $2.5k–$6k. [CPSC advisory; NEC 240]`,
        type: "risk",
      });
    }
  }

  if (buildYr && buildYr >= 1965 && buildYr <= 1973) {
    if (
      !["REWIRE", "ALUMINUM WIRING", "CO/ALR", "COPALUM", "ALUMICONN", "PIGTAIL"].some((k) =>
        allDescs.includes(k)
      )
    ) {
      score -= 12;
      log.push({
        cat: "electrical",
        msg: `Fire Risk: Home built ${buildYr} — aluminum branch circuit wiring era. Connections loosen over time creating arcing; CPSC data shows 55x fire risk vs copper. Requires CO/ALR outlets, COPALUM crimping, or full rewire. Est. $3k–$20k. [NEC 310.106; CPSC]`,
        type: "risk",
      });
    }
  }

  if (buildYr && buildYr < 1950) {
    if (
      !["REWIRE", "REWIRING", "WIRING REPLAC", "FULL ELECTRICAL", "COMPLETE ELECTRICAL"].some((k) =>
        allDescs.includes(k)
      )
    ) {
      score -= 20;
      log.push({
        cat: "electrical",
        msg: `Fire/Safety Risk: Home built ${buildYr} — knob-and-tube wiring likely present. Ungrounded; incompatible with modern insulation (fire hazard when buried). Most MN/national insurers refuse to bind policies. Full rewire est. $12k–$25k. [NEC Art. 394; insurance industry standard]`,
        type: "risk",
      });
    }
  }

  if (!["LATERAL LOAD", "TENSION TIE", "DECK REBUILD"].some((k) => allDescs.includes(k))) {
    for (const p of permits) {
      const desc = String(p.description || "").toUpperCase();
      if (["DECK", "PORCH", "BALCONY"].some((k) => desc.includes(k))) {
        const yrStr = (p.permit_creation_date || "9999").slice(0, 4);
        const yr = parseInt(yrStr, 10);
        if (!Number.isNaN(yr) && yr < 2015) {
          score -= 15;
          log.push({
            cat: "structure",
            msg: `Structural Risk: Deck permit (${yr}) predates IRC R507 lateral load anchoring requirement (2015). Pre-2015 decks attached with nails only — 90% of deck collapses involve ledger failure. Rebuild est. $8k–$20k. [IRC R507.9.2 / MRC R507]`,
            type: "risk",
          });
          break;
        }
      }
    }
  }

  if (buildYr && buildYr < 1993) {
    if (!["REWIRE", "FULL ELECTRICAL", "WHOLE HOUSE ELECTRIC"].some((k) => allDescs.includes(k))) {
      score -= 4;
      log.push({
        cat: "life_safety",
        msg: `Life Safety Gap: Home built ${buildYr} — interconnected hardwired smoke alarms may be absent (required by IRC R314 since 1993). If one alarm sounds, all should sound. Upgrade est. $500–$2k. [IRC R314]`,
        type: "risk",
      });
    }
  }

  const whYears: number[] = [];
  for (const p of permits) {
    const desc = String(p.description || "").toUpperCase();
    if (["WATER HEATER", "HOT WATER", "WH REPLACE"].some((k) => desc.includes(k))) {
      const yr = parseInt((p.permit_creation_date || "9999").slice(0, 4), 10);
      if (!Number.isNaN(yr)) whYears.push(yr);
    }
  }
  if (whYears.length > 0) {
    const maxYr = Math.max(...whYears);
    if (maxYr < 2000) {
      score -= 3;
      log.push({
        cat: "plumbing",
        msg: `Safety Note: Most recent water heater permit (${maxYr}) is 25+ years old. TPRV compliance uncertain; unit likely at end of typical 15-year lifespan. Replacement est. $800–$2,500. [IRC P2803; ASME A112.4.1]`,
        type: "risk",
      });
    }
  }

  return { score: Math.max(score, 0), findings: log };
}
