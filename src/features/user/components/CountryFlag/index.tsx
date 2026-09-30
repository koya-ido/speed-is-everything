const CONFIGURED_COUNTRIES = [
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
];

export const CountryFlag = ({
  countryCode,
}: {
  countryCode: string | null;
}) => {
  if (!countryCode) return <span>-</span>;
  if (CONFIGURED_COUNTRIES.includes(countryCode)) {
    return (
      <img
        src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
        alt={countryCode}
        className="inline-block w-5 sm:w-6 h-auto rounded-[2px] drop-shadow-[0_0_2px_rgba(255,255,255,0.3)]"
      />
    );
  }
  return <span>🌐</span>;
};
