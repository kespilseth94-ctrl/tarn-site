// Code-era risk glossary — plain-language explainers for the national,
// year-gated findings in src/lib/risk-engine.ts's analyzeHistory(). Cost
// ranges and code citations here are pulled directly from risk-engine.ts
// so the glossary and the actual report stay consistent. Voice follows
// VerifiHouse_CreativeBrief_v1.0.docx: no verdicts, no "violation"/
// "non-compliant"/"illegal" — code changes are prospective and grandfather
// existing homes, so the framing is always "predates the current standard"
// or "worth having evaluated," never alarmist.

export interface RiskGuide {
  slug: string;
  title: string;
  shortTitle: string;
  category: string;
  yearCondition: string;
  summary: string;
  whatItIs: string;
  whyItMatters: string;
  whatToDo: string;
  costRange?: string;
  citations: string[];
}

export const RISK_GUIDES: RiskGuide[] = [
  {
    slug: "lead-paint",
    title: "Lead Paint in Homes Built Before 1978",
    shortTitle: "Lead paint",
    category: "Health",
    yearCondition: "Built before 1978",
    summary:
      "Homes built before 1978 are presumed by federal law to contain lead-based paint somewhere in the home, unless testing shows otherwise.",
    whatItIs:
      "In 1978, the Consumer Product Safety Commission banned lead-based paint for residential use. HUD's Title X disclosure rule treats any home built before that year as presumed to contain lead-based paint, even if it's been painted over many times since.",
    whyItMatters:
      "Lead paint in good condition and left undisturbed is generally low-risk. The concern is paint that's chipping, peeling, or gets disturbed by renovation — sanding, scraping, or demolition can release lead dust, a documented health hazard, especially for young children and pregnant women.",
    whatToDo:
      "A lead-based paint inspection or risk assessment by a certified professional can confirm whether it's present and where. For a home built before 1978, that's worth having done before any renovation work that disturbs painted surfaces, even if it wasn't flagged as a specific concern during the walkthrough.",
    citations: ["HUD Title X (1978)", "CPSC"],
  },
  {
    slug: "polybutylene-pipe",
    title: "Polybutylene Pipe in Homes Built 1978–1995",
    shortTitle: "Polybutylene pipe",
    category: "Plumbing",
    yearCondition: "Built 1978–1995",
    summary:
      "Homes built between 1978 and 1995 may have polybutylene (PB) water supply pipe — a plastic pipe material at the center of a large class-action settlement over fitting failures.",
    whatItIs:
      "Polybutylene pipe was a common, lower-cost alternative to copper for water supply lines during this window. It typically looks like gray or blue plastic tubing, connected with plastic or metal crimp fittings.",
    whyItMatters:
      "PB pipe was the subject of a major class-action settlement (Cox v. Shell Oil, 1995) after widespread reports of brittle failure at the fittings, sometimes years after installation and without an obvious warning sign beforehand. Some mortgage insurers now ask for documented replacement before closing.",
    whatToDo:
      "If a home falls in this build-year range, it's worth asking whether the original water lines have been replaced (a "repipe") and, if not, having a plumber confirm what material is actually in the walls.",
    costRange: "$4,000–$15,000",
    citations: ["Cox v. Shell Oil, 1995 settlement", "IRC P2906"],
  },
  {
    slug: "electrical-panel-age",
    title: "Older Electrical Panels in Homes Built Before 1990",
    shortTitle: "Electrical panel age",
    category: "Electrical",
    yearCondition: "Built before 1990",
    summary:
      "Homes built before 1990 without a documented panel upgrade may still have their original electrical panel, including brands like Federal Pacific (FPE Stab-Lok) or Zinsco that have a documented history of breaker failures.",
    whatItIs:
      "Federal Pacific Stab-Lok and Zinsco panels were widely installed between roughly 1950 and 1990. Independent testing over the following decades found their breakers fail to trip under overload conditions at meaningfully higher rates than modern panels — the panel's whole job is to trip and cut power when something goes wrong.",
    whyItMatters:
      "A panel that doesn't reliably trip is a fire risk, which is why a growing number of insurers ask about panel brand and either decline coverage or require replacement before binding a policy.",
    whatToDo:
      "It's worth having a licensed electrician confirm the panel brand at inspection, since panel labels aren't always obvious from a quick look.",
    costRange: "$2,500–$6,000",
    citations: ["CPSC advisory", "NEC 240"],
  },
  {
    slug: "aluminum-wiring",
    title: "Aluminum Branch Wiring in Homes Built 1965–1973",
    shortTitle: "Aluminum wiring",
    category: "Electrical",
    yearCondition: "Built 1965–1973",
    summary:
      "Homes built between 1965 and 1973 may have aluminum branch-circuit wiring instead of copper — a material with a documented higher fire risk at its connections.",
    whatItIs:
      "Rising copper prices in the mid-1960s led many builders to switch to aluminum wiring for a several-year window. Aluminum isn't inherently unsafe, but it expands and contracts more than copper and can loosen at outlets and switches over time.",
    whyItMatters:
      "A loose connection creates resistance, which creates heat — that's where the fire risk comes from. CPSC data associates aluminum-wired connections with meaningfully higher fire risk than copper over time.",
    whatToDo:
      "The fix isn't necessarily a full rewire — CO/ALR-rated outlets and switches, or a technique called COPALUM crimping, can address the connection points directly and often cost less than replacing all the wiring. Worth having an electrician assess which approach fits the home.",
    costRange: "$3,000–$20,000",
    citations: ["NEC 310.106", "CPSC"],
  },
  {
    slug: "knob-and-tube-wiring",
    title: "Knob-and-Tube Wiring in Homes Built Before 1950",
    shortTitle: "Knob-and-tube wiring",
    category: "Electrical",
    yearCondition: "Built before 1950",
    summary:
      "Homes built before 1950 without a documented rewire may still have some of their original knob-and-tube wiring — an ungrounded system that most insurers won't cover.",
    whatItIs:
      "Knob-and-tube wiring was the standard residential wiring method into the early-to-mid 20th century: individual insulated wires run through ceramic knobs and tubes, rather than the sheathed cable used today.",
    whyItMatters:
      "It has no ground wire, and its insulation wasn't designed to be packed in with modern attic or wall insulation, which can trap heat around the wire. Most insurers, in Minnesota and nationally, decline to write policies on homes with active knob-and-tube wiring.",
    whatToDo:
      "A full rewire is typically what insurers ask for. Worth confirming with an electrician whether any original wiring remains before budgeting for it — many older homes have already had some or all of it replaced.",
    costRange: "$12,000–$25,000",
    citations: ["NEC Art. 394", "insurance industry standard"],
  },
  {
    slug: "smoke-alarm-interconnection",
    title: "Smoke Alarm Interconnection in Homes Built Before 1993",
    shortTitle: "Smoke alarm interconnection",
    category: "Life safety",
    yearCondition: "Built before 1993",
    summary:
      "Homes built before 1993 without a later electrical update may have standalone smoke alarms instead of interconnected ones — meaning an alarm in one room won't necessarily trigger alarms elsewhere in the home.",
    whatItIs:
      "Since 1993, the residential building code (IRC R314) has required hardwired, interconnected smoke alarms: when one sounds, they all sound. Homes built before that requirement may only have individual battery alarms that operate independently.",
    whyItMatters:
      "In a fire, the extra time it takes for a standalone alarm in a distant room to be heard can matter — especially in larger homes, or homes where people sleep with doors closed.",
    whatToDo:
      "Upgrading to interconnected alarms (hardwired or connected wirelessly) is a comparatively small project, and worth asking an electrician about regardless of whether anything else electrical is being done.",
    costRange: "$500–$2,000",
    citations: ["IRC R314"],
  },
];
