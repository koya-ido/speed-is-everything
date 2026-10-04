import Image from "next/image";

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
      <Image
        src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
        alt={countryCode}
        width={40}
        height={30}
        unoptimized
        className="inline-block w-5 sm:w-6 h-auto rounded-[2px] drop-shadow-[0_0_2px_rgba(255,255,255,0.3)]"
      />
    );
  }
  return <span>🌐</span>;
};
