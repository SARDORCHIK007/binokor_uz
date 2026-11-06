export const demoStats = [
  { key: "listeners", value: "412" },
  { key: "certified", value: "186" },
  { key: "employed", value: "129" },
  { key: "sites", value: "10" },
] as const;

export const tradeCodes = [
  "plumber",
  "electrician",
  "bricklayer",
  "tiler",
  "welder",
  "plasterer",
  "roofer",
  "carpenter",
  "painter",
  "concrete",
  "rebar",
  "drafting",
] as const;

export const destinationCodes = ["de", "jp", "kr", "sa", "ae", "tr"] as const;

export const partners = [
  { key: "namdtu", status: "signed", showLogo: true },
  { key: "hokimlik", status: "signed", showLogo: false },
  { key: "agency", status: "negotiating", showLogo: false },
  { key: "producer", status: "planned", showLogo: false },
] as const;

export const demoCertificate = {
  number: "UB-2026-000123",
  name: "Aziz Karimov",
  trade: "plumber",
  levelKey: "levelMaster",
  rating: "4,8",
  reviews: 12,
  hours: "1 240",
  language: "de",
  words: 820,
  issued: "15.03.2027",
} as const;

export const attendanceNames = ["Aziz K.", "Bobur T.", "Davron S.", "Jasur A.", "Sardor M."] as const;

export const funnel = [
  { value: "1 200", labelKey: "funnelApplied" },
  { value: "830", labelKey: "funnelAccepted" },
  { value: "760", labelKey: "funnelStudying" },
  { value: "410", labelKey: "funnelCertified" },
  { value: "290", labelKey: "funnelPlaced" },
] as const;

export const CERT_PATTERN = /^UB-\d{4}-\d{6}$/;
