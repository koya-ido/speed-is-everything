export const STANDARD_COUNTRIES = [
  "JP",
  "US",
  "GB",
  "ID",
  "KR",
  "TH",
  "TW",
  "CN",
  "NP",
  "PH",
  "VN",
] as const;

export type StandardCountry = (typeof STANDARD_COUNTRIES)[number];
