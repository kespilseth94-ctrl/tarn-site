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

  // MN Code Timeline (state-code safety-gap layer) is Minneapolis-specific
  // in the source app and intentionally not applied to other cities here.

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
