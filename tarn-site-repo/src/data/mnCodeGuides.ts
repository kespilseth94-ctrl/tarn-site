// Minnesota code-era guides — plain-language explainers for the state-code
// safety-gap layer in src/lib/risk-engine.ts's MN_CODE_TIMELINE. Minnesota
// runs a uniform statewide building code, so none of this is municipal
// ordinance: it applies to every MN city Tarn covers, not just Minneapolis.
//
// Cost ranges are pulled from risk-engine.ts so the guides and the live
// report stay consistent. Citations were verified against revisor.mn.gov
// rather than copied from the engine, and three engine claims were NOT
// carried over verbatim because they did not survive that check:
//   1. The CO-alarm entry cites MN Stat. 299F.50 (definitions); the actual
//      alarm requirement is 299F.51.
//   2. The septic entry states MN law requires a compliance inspection at
//      sale. It does not — 115.55 subd. 6 requires DISCLOSURE at transfer;
//      inspection timing is set by local ordinance and varies by county.
//   3. The egress entry uses the word "illegal," which the creative brief
//      explicitly forbids. Code changes are prospective and grandfather
//      existing homes.
// See TARNHOME_REBUILD_STATUS.md — these are engine bugs worth fixing at
// the source, not just working around here.
//
// Voice follows VerifiHouse_CreativeBrief_v1.0.docx: no verdicts, no
// "violation"/"non-compliant"/"illegal", always "predates the current
// standard" or "worth having evaluated."

export interface MnCodeGuide {
  slug: string;
  title: string;
  shortTitle: string;
  system: "Electrical" | "Structural" | "Plumbing" | "Roofing" | "HVAC";
  /** Human-readable effective date, e.g. "2002" or "Phased in from 1975". */
  effectiveYear: string;
  /** Which homes the factor applies to, e.g. "Built before 2002". */
  yearCondition: string;
  summary: string;
  whatItIs: string;
  whyItMatters: string;
  whatToDo: string;
  costRange?: string;
  citations: string[];
  /** Matching MN_CODE_TIMELINE id(s) in risk-engine.ts. */
  engineIds: string[];
}

/** A row in the hub page's full 15-requirement timeline table. */
export interface MnTimelineRow {
  system: MnCodeGuide["system"];
  requirement: string;
  effective: string;
  appliesTo: string;
  /** Link to the MN guide, or to the existing national guide where one covers it. */
  href: string;
  /** True when href points at a national guide rather than an MN-specific one. */
  national?: boolean;
}

/** Every MN city the timeline runs for — mirrors MN_CITY_NAMES in risk-engine.ts. */
export const MN_GUIDE_CITIES: { name: string; slug: string }[] = [
  { name: "Minneapolis", slug: "minneapolis-mn" },
  { name: "Minnetonka", slug: "minnetonka-mn" },
  { name: "Edina", slug: "edina-mn" },
  { name: "Eden Prairie", slug: "eden-prairie-mn" },
  { name: "St. Louis Park", slug: "st-louis-park-mn" },
  { name: "Maple Grove", slug: "maple-grove-mn" },
];

export const MN_GUIDES_LAST_UPDATED = "2026-09-21";

export const MN_GUIDES_AUTHOR = {
  name: "Karl Espilseth",
  role: "Founder, Tarn",
  bio: "I built Tarn as a homeowner, not a code official. Everything on this page is sourced to published Minnesota law and linked so you can check it yourself.",
};

export const MN_CODE_GUIDES: MnCodeGuide[] = [
  {
    slug: "afci-arc-fault-protection",
    title: "AFCI Protection and Minnesota's 2002 and 2012 Thresholds",
    shortTitle: "AFCI protection",
    system: "Electrical",
    effectiveYear: "2002 (bedrooms), 2012 (most habitable rooms)",
    yearCondition: "Built before 2012",
    summary:
      "Arc-fault protection became required on bedroom circuits in 2002 and expanded to most habitable rooms about a decade later. Homes wired before those dates generally were not built with it.",
    whatItIs:
      "An AFCI, or arc-fault circuit interrupter, is a breaker that watches for the electrical signature of an arcing fault — the intermittent sparking that happens at a loose terminal, a wire pinched by a staple, or insulation damaged by a nail. When it sees that pattern, it cuts power. In the panel it looks like an ordinary breaker with a small test button. The requirement for bedroom circuits came from the 1999 National Electrical Code with a delayed effective date of January 1, 2002, and the 2011 code cycle extended it to most habitable rooms.",
    whyItMatters:
      "A standard breaker responds to two things: drawing more current than the circuit is rated for, and a dead short. An arcing fault is neither. It can smolder at a connection for a long time, generating enough heat to ignite framing or insulation, while drawing current well below the point where a conventional breaker would notice. That gap is the specific thing AFCIs were designed to close. A home wired before 2002 typically has none; one wired between 2002 and 2012 often has them on bedroom circuits only.",
    whatToDo:
      "This is one of the easier things to check. An electrician can open the panel and tell you in a few minutes which circuits have arc-fault protection, and adding it is usually a breaker swap rather than rewiring — which is why it costs a fraction of most electrical work. If the home predates 2012, it is worth knowing where it actually stands before you are living in it.",
    costRange: "$800–$3,000 for bedroom circuits; $2,000–$6,000 to extend to all habitable rooms",
    citations: [
      "NEC 210.12 (1999 ed.), effective January 1, 2002",
      "NEC 210.12 (2011 ed.)",
      "MN Rule 1315 (Minnesota Electrical Code)",
    ],
    engineIds: ["elec_afci_bedrooms", "elec_afci_whole_home"],
  },
  {
    slug: "gfci-protection",
    title: "GFCI Protection in Minnesota Homes Built Before 1975",
    shortTitle: "GFCI protection",
    system: "Electrical",
    effectiveYear: "Phased in from 1975 through the 1990s",
    yearCondition: "Built before 1975",
    summary:
      "Ground-fault protection was required location by location over roughly twenty years, starting with outdoor receptacles and bathrooms. Where a home falls in that sequence depends on when it was built.",
    whatItIs:
      "A GFCI, or ground-fault circuit interrupter, compares the current flowing out on the hot conductor against the current returning on the neutral. If some of it is going somewhere else — through a person, through water, through a grounded appliance housing — the difference trips the device in a fraction of a second. You usually see them as outlets with TEST and RESET buttons, though they also come as breakers protecting a whole circuit.",
    whyItMatters:
      "The requirement was never introduced all at once. It arrived location by location as the code caught up with where shock injuries were actually happening: outdoor receptacles and bathrooms first in the mid-1970s, then garages, kitchen counters, crawl spaces and unfinished basements over the following two decades. That means an older home often has protection in some of those places and not others, and which ones is a question of what the code required the year the work was done rather than anything about the quality of the wiring.",
    whatToDo:
      "The test button is a real test — pressing it on each protected outlet confirms the device still works, and GFCIs do wear out. Walking the wet locations in the home (bathrooms, kitchen, garage, exterior, basement) and checking which have protection gives you a quick picture. Adding it where it is missing is typically an outlet-level change, not a rewire.",
    costRange: "$500–$2,500",
    citations: [
      "NEC 210.8 (multiple editions, 1971–1996)",
      "MN Rule 1315 (Minnesota Electrical Code)",
    ],
    engineIds: ["elec_gfci"],
  },
  {
    slug: "basement-egress-windows",
    title: "Basement Egress Windows in Minnesota Homes Built Before 1990",
    shortTitle: "Basement egress",
    system: "Structural",
    effectiveYear: "1990",
    yearCondition: "Built before 1990 with basement sleeping rooms",
    summary:
      "A basement bedroom needs a window large enough to climb out of and for a firefighter to climb into. Finished basements that predate the requirement often have windows that do not meet it.",
    whatItIs:
      "An egress opening is a window or door sized so a person can get out under their own power and a firefighter in full gear can get in. The code sets a minimum clear opening area, minimum width and height, a maximum sill height above the floor, and — for a below-grade window — a window well big enough to actually stand and climb in. In Minnesota these requirements come through IRC R310 as adopted in MN Rule 1309.",
    whyItMatters:
      "A finished basement is one of the most common ways a home gains a bedroom count and listed square footage, and it is also where this requirement most often goes unmet. A basement sleeping room without a conforming opening predates the standard rather than breaking it — code changes apply going forward, not retroactively. But it is worth understanding for two practical reasons: it is a genuine life-safety consideration in the room where someone will be asleep, and appraisers and some insurers treat a room without conforming egress differently from a bedroom when they are counting what the home has.",
    whatToDo:
      "Measure the actual clear opening rather than the window's nominal size — the number that matters is how much unobstructed space you get when it is fully open, which is smaller than the frame. If the home was finished below grade before 1990 and the listing counts a basement bedroom, ask whether an egress window was ever permitted. Retrofitting one means cutting the foundation wall and excavating a well, which is why it costs what it does.",
    costRange: "$3,000–$8,000 per opening",
    citations: ["IRC R310", "MN Rule 1309 (Minnesota Residential Code)"],
    engineIds: ["struct_egress"],
  },
  {
    slug: "stucco-eifs-moisture-barrier",
    title: "Stucco and EIFS Moisture Barriers in Minnesota Homes Before 2003",
    shortTitle: "Stucco and EIFS",
    system: "Structural",
    effectiveYear: "2003",
    yearCondition: "Stucco or EIFS installed before 2003",
    summary:
      "Minnesota amended its moisture-barrier requirements after widespread stucco failures in the Twin Cities. Exterior cladding installed before that change was often built without a drainage plane behind it.",
    whatItIs:
      "EIFS — exterior insulation and finish system, often called synthetic stucco — is a layered exterior wall assembly of foam insulation, mesh and a thin finish coat. The critical detail is not the surface but what sits behind it. A drainage plane gives any water that gets past the finish somewhere to go and a way back out. Early installations were often applied as a sealed barrier system with no drainage path, on the theory that keeping water out entirely was enough.",
    whyItMatters:
      "In Minnesota's climate, water gets in. It gets in at windows, at penetrations, at transitions, and through freeze-thaw cycling that opens small gaps. When it gets behind a sealed system with nowhere to drain, it stays against the sheathing, and the damage develops out of sight — sometimes for years before anything is visible from inside or outside. The failures in Woodbury and elsewhere in the early 2000s are what drove Minnesota's amendments, and they are also why some insurers now ask specific questions about stucco on homes of this vintage.",
    whatToDo:
      "This is the factor on this list where a specialist inspection is most worth the money, because visual inspection genuinely will not tell you. Moisture testing — probe readings taken at the vulnerable points around windows and penetrations — is the standard approach and is a distinct service from a general home inspection. If the home has stucco or EIFS applied before 2003, it is worth doing before the inspection contingency expires rather than after.",
    costRange: "$15,000–$60,000 if remediation is needed",
    citations: [
      "IRC R703",
      "MN Rule 1309 (Minnesota Residential Code)",
      "Minnesota moisture-barrier amendments following the 2002 Woodbury stucco failures",
    ],
    engineIds: ["struct_stucco_eifs"],
  },
  {
    slug: "galvanized-supply-pipe",
    title: "Galvanized Steel Supply Pipe in Homes Built Before 1960",
    shortTitle: "Galvanized pipe",
    system: "Plumbing",
    effectiveYear: "Typical service life 50–70 years",
    yearCondition: "Built before 1960 with no repipe on record",
    summary:
      "Galvanized steel was the standard water supply material for decades. It corrodes from the inside, and homes still on their original pipe are at or past the material's expected life.",
    whatItIs:
      "Galvanized steel pipe is zinc-coated steel, threaded together at the joints. It was the default for residential water supply lines well into the 1950s, before copper and later PEX took over. You can usually identify it at exposed runs in a basement or utility room: dull gray, threaded fittings, and a magnet sticks to it.",
    whyItMatters:
      "The failure mode is gradual and internal. The zinc coating wears away, the steel underneath corrodes, and mineral scale builds up inside the pipe, narrowing the bore. The first symptoms are usually reduced flow — noticeably weaker pressure when two fixtures run at once — along with discolored water after the house has sat unused. Because the corrosion is inside the pipe, the outside can look entirely sound right up until a joint lets go. A home built before 1960 with no repipe on record is at or past the 50-to-70-year range this material is generally expected to last.",
    whatToDo:
      "Run a couple of fixtures at once and watch what pressure does, and look at the exposed pipe where it enters the house and at the water heater. A plumber can tell you what material is actually in the walls, which matters because many homes have been partially repiped — copper in the visible sections, original galvanized in everything behind plaster.",
    costRange: "$5,000–$18,000 for a full repipe",
    citations: ["UPC 604.1", "MN Rule 4714 (Minnesota Plumbing Code)"],
    engineIds: ["plumb_galvanized"],
  },
  {
    slug: "sewer-lateral-clay-orangeburg",
    title: "Clay and Orangeburg Sewer Laterals in Homes Built Before 1980",
    shortTitle: "Sewer lateral",
    system: "Plumbing",
    effectiveYear: "1980",
    yearCondition: "Built before 1980",
    summary:
      "The sewer line from the house to the street is the homeowner's responsibility, and homes of this era were commonly connected with clay tile or Orangeburg pipe. Several Twin Cities cities require an inspection at sale.",
    whatItIs:
      "The sewer lateral is the buried line carrying waste from the house to the municipal main, usually under the front yard and often under the street. In homes of this vintage it is typically vitrified clay tile, laid in short sections with joints between them, or Orangeburg — a pipe made of layered wood fiber and pitch, used widely in the post-war decades.",
    whyItMatters:
      "Both materials fail in predictable ways. Clay tile joints separate slightly as the ground moves, and tree roots find those joints and grow into them. Orangeburg, being essentially tar-impregnated fiber, deforms under soil load over time and can go oval or collapse. Neither shows any sign inside the house until the line backs up. What makes this worth checking specifically in the Twin Cities is that it is both expensive and, in several cities here, a point-of-sale requirement — so it can become a closing-timeline problem rather than just a maintenance problem.",
    whatToDo:
      "A sewer scope — a camera run down the line from a cleanout — is the only way to see the actual condition, and it is inexpensive relative to what it can find. It is a separate service from a standard home inspection and usually has to be requested specifically. Check the individual city's requirements too: point-of-sale sewer inspection rules are set city by city in the metro, not statewide, so what applies in one suburb may not apply in the next.",
    costRange: "$5,000–$25,000 for replacement",
    citations: [
      "MN Rule 4714 (Minnesota Plumbing Code)",
      "Municipal point-of-sale sewer compliance ordinances (vary by city)",
    ],
    engineIds: ["plumb_sewer"],
  },
  {
    slug: "septic-system-compliance",
    title: "Septic Systems and What Minnesota Actually Requires at Sale",
    shortTitle: "Septic compliance",
    system: "Plumbing",
    effectiveYear: "Disclosure required statewide; inspection set locally",
    yearCondition: "Any property on a septic system",
    summary:
      "Minnesota requires the seller to disclose the septic system at transfer. Whether a compliance inspection is required, and when, is set by county or city ordinance rather than by state law.",
    whatItIs:
      "A subsurface sewage treatment system — the term Minnesota rules use for what most people call a septic system — handles wastewater on the property rather than through a municipal sewer. A conventional system is a tank plus a drainfield; in soils that cannot absorb effluent at depth, Minnesota commonly uses a mound system instead, which is why you sometimes see a raised bed of sand in a rural or edge-of-metro yard.",
    whyItMatters:
      "There is a common belief that Minnesota requires a septic compliance inspection at every sale. That is not what state law says. Minn. Stat. 115.55 subd. 6 requires the seller to disclose the system and what they know about its compliance status at the time of transfer. The inspection requirements themselves — whether one is required at sale, who may perform it, and how long a certificate stays valid — are set by local ordinance, and they differ meaningfully from county to county across the metro and beyond it. The practical consequence is the same either way: lenders frequently want a compliance certificate before closing, so an unresolved septic question can hold up a transaction even where no ordinance strictly compels an inspection.",
    whatToDo:
      "Start with the county, not the state — the county environmental services or public health office can tell you what applies at that specific address and whether a compliance certificate is already on file. Ask the seller for the most recent certificate, the tank pumping history, and a drawing of where the system actually sits. Minnesota rules contemplate regular maintenance, and a system that has not been pumped in years is worth understanding before you own it.",
    costRange: "$3,000–$40,000 for replacement, depending on system type",
    citations: [
      "Minn. Stat. 115.55, subd. 6 (disclosure at transfer)",
      "MN Rules ch. 7080–7083 (subsurface sewage treatment systems)",
      "County and municipal ordinances (inspection timing varies)",
    ],
    engineIds: ["plumb_septic"],
  },
  {
    slug: "roof-ice-barrier",
    title: "Roof Ice Barrier Membrane in Minnesota Roofs Installed Before 2000",
    shortTitle: "Ice barrier",
    system: "Roofing",
    effectiveYear: "2000",
    yearCondition: "Roof permit before 2000",
    summary:
      "Minnesota's climate requires a waterproof membrane along the eaves to handle ice dams. Roofs installed before the requirement often do not have one under the shingles.",
    whatItIs:
      "An ice barrier is a self-adhering waterproof membrane applied directly to the roof deck along the eaves, underneath the shingles, extending far enough up the slope to cover the area where ice dams form. It is different from ordinary felt underlayment in that it seals around the nails driven through it, so water sitting on top of it has no path down into the deck.",
    whyItMatters:
      "Ice dams are a function of climate, not workmanship. Heat escaping into the attic melts snow on the upper roof, the meltwater runs down to the cold overhang, refreezes there, and builds a ridge of ice that backs standing water up under the shingles. Shingles shed water running downhill; they do not seal against water sitting still and pushing uphill. That is the specific condition the membrane addresses, and it is why the code requires it in Minnesota's climate zones and not in warm ones.",
    whatToDo:
      "The membrane is invisible once the roof is on, so the practical question is when the roof was last replaced. If it was reroofed after 2000 it almost certainly has one. If the last permit predates that, this is worth raising at the next reroof rather than as a reason to do one early — the added cost at the time of a planned replacement is small, while tearing off a sound roof to add it is not. Interior signs worth noticing in the meantime: staining on the ceiling near exterior walls, or water showing up at the top of a window frame after a thaw.",
    costRange: "$500–$2,000 added at the time of a reroof",
    citations: [
      "IRC R905.1.2 / R905.2.7.1 (ice barrier)",
      "MN Rule 1309 (Minnesota Residential Code)",
      "Minnesota climate zones 6 and 7",
    ],
    engineIds: ["roof_ice_barrier"],
  },
  {
    slug: "carbon-monoxide-alarms",
    title: "Carbon Monoxide Alarms and Minnesota's Requirement",
    shortTitle: "CO alarms",
    system: "HVAC",
    effectiveYear: "Enacted 2006",
    yearCondition: "Built before 2007 with fuel-burning appliances",
    summary:
      "Minnesota requires an approved carbon monoxide alarm within ten feet of every room used for sleeping. Homes built before the requirement were not constructed with them, though they are inexpensive to add.",
    whatItIs:
      "Minn. Stat. 299F.51 requires every single-family dwelling and every unit in a multifamily dwelling to have an approved and operational carbon monoxide alarm installed within ten feet of each room lawfully used for sleeping. The statute was enacted in 2006 and has been amended since. The ten-foot rule is the part most often missed in practice — a single alarm in a hallway may or may not satisfy it depending on where the bedrooms actually are.",
    whyItMatters:
      "Carbon monoxide has no color, no odor and no taste, and the early symptoms of exposure resemble ordinary illness closely enough that people routinely miss them. Any appliance that burns fuel can produce it if it is not venting properly: a furnace, a water heater, a gas range, a fireplace, an attached garage with a car running in it. Detection is the only practical defense, which is why the requirement exists at all rather than being left to maintenance.",
    whatToDo:
      "This is the least expensive item on this list by a wide margin, and the only one you can resolve yourself the week you move in. Count the sleeping rooms, check that an alarm sits within ten feet of each, and check the manufacture date on any alarm already installed — the sensors have a service life, typically seven to ten years, and an expired alarm that still chirps on the test button is not necessarily still detecting anything. Combination smoke-and-CO units are common, but confirm what you actually have rather than assuming a detector on the ceiling covers both.",
    costRange: "$30–$100 per alarm",
    citations: [
      "Minn. Stat. 299F.51 (requirements for carbon monoxide alarms)",
      "IRC R315",
    ],
    engineIds: ["hvac_co_detector"],
  },
];

// The full 15-requirement timeline for the hub page. Entries whose topic is
// already covered by a national guide link there instead of duplicating it,
// so no two pages compete for the same term.
export const MN_TIMELINE_ROWS: MnTimelineRow[] = [
  {
    system: "Electrical",
    requirement: "Knob-and-tube wiring gives way to modern branch circuits",
    effective: "Before 1950",
    appliesTo: "Built before 1950",
    href: "/guides/knob-and-tube-wiring",
    national: true,
  },
  {
    system: "Electrical",
    requirement: "Aluminum branch wiring era",
    effective: "1965–1973",
    appliesTo: "Built 1965–1973",
    href: "/guides/aluminum-wiring",
    national: true,
  },
  {
    system: "Electrical",
    requirement: "GFCI protection phased in by location",
    effective: "From 1975",
    appliesTo: "Built before 1975",
    href: "/guides/minnesota/gfci-protection",
  },
  {
    system: "Electrical",
    requirement: "FPE Stab-Lok and Zinsco panel era",
    effective: "1950–1990",
    appliesTo: "Panel installed before 1990",
    href: "/guides/electrical-panel-age",
    national: true,
  },
  {
    system: "Electrical",
    requirement: "AFCI protection required on bedroom circuits",
    effective: "January 1, 2002",
    appliesTo: "Built before 2002",
    href: "/guides/minnesota/afci-arc-fault-protection",
  },
  {
    system: "Electrical",
    requirement: "AFCI protection extended to most habitable rooms",
    effective: "2012",
    appliesTo: "Built before 2012",
    href: "/guides/minnesota/afci-arc-fault-protection",
  },
  {
    system: "Structural",
    requirement: "Basement sleeping rooms require conforming egress",
    effective: "1990",
    appliesTo: "Built before 1990",
    href: "/guides/minnesota/basement-egress-windows",
  },
  {
    system: "Structural",
    requirement: "Moisture barrier and drainage plane behind stucco and EIFS",
    effective: "2003",
    appliesTo: "Cladding installed before 2003",
    href: "/guides/minnesota/stucco-eifs-moisture-barrier",
  },
  {
    system: "Structural",
    requirement: "Deck ledgers require lateral load anchoring",
    effective: "2015",
    appliesTo: "Deck permit before 2015",
    href: "/guides/deck-lateral-load-anchoring",
    national: true,
  },
  {
    system: "Plumbing",
    requirement: "Galvanized steel supply pipe reaches end of service life",
    effective: "Before 1960",
    appliesTo: "Built before 1960",
    href: "/guides/minnesota/galvanized-supply-pipe",
  },
  {
    system: "Plumbing",
    requirement: "Clay tile and Orangeburg sewer laterals",
    effective: "Before 1980",
    appliesTo: "Built before 1980",
    href: "/guides/minnesota/sewer-lateral-clay-orangeburg",
  },
  {
    system: "Plumbing",
    requirement: "Polybutylene supply pipe era",
    effective: "1978–1995",
    appliesTo: "Built 1978–1995",
    href: "/guides/polybutylene-pipe",
    national: true,
  },
  {
    system: "Plumbing",
    requirement: "Septic system disclosure at transfer",
    effective: "Statewide; inspection set locally",
    appliesTo: "Any property on septic",
    href: "/guides/minnesota/septic-system-compliance",
  },
  {
    system: "Roofing",
    requirement: "Ice barrier membrane required at eaves",
    effective: "2000",
    appliesTo: "Roof permit before 2000",
    href: "/guides/minnesota/roof-ice-barrier",
  },
  {
    system: "HVAC",
    requirement: "Carbon monoxide alarm within ten feet of each sleeping room",
    effective: "Enacted 2006",
    appliesTo: "Built before 2007",
    href: "/guides/minnesota/carbon-monoxide-alarms",
  },
];
