"use client";

import { Dropdown, DropdownItem } from "@/components/Dropdown";
import { CountryFlag } from "@/features/user/components/CountryFlag";
import { STANDARD_COUNTRIES } from "@/features/user/constants/countries";
import { useTranslations } from "next-intl";

export type CountrySelectProps = {
  country: string;
  onCountryChange: (country: string) => void;
  customCountry: string;
  onCustomCountryChange: (customCountry: string) => void;
};

export const CountrySelect = ({
  country,
  onCountryChange,
  customCountry,
  onCustomCountryChange,
}: CountrySelectProps) => {
  const t = useTranslations("Onboarding");

  const getCountryName = (code: string) => {
    if (!code) return t("country_none");
    if (code === "OTHER") {
      return t("country_other");
    }
    const isStandard = STANDARD_COUNTRIES.includes(
      code as (typeof STANDARD_COUNTRIES)[number],
    );
    if (isStandard) {
      return t(`country_${code.toLowerCase()}` as Parameters<typeof t>[0]);
    }
    return code;
  };

  return (
    <div>
      <label className="block text-xs font-cyber tracking-widest uppercase text-[#bc13fe] mb-2 drop-shadow-[0_0_5px_rgba(188,19,254,0.5)]">
        {t("label_country")}
      </label>

      {/* Hidden native select for E2E testing, accessibility & form compatibility */}
      <select
        value={country}
        onChange={(e) => {
          onCountryChange(e.target.value);
          if (e.target.value !== "OTHER") {
            onCustomCountryChange("");
          }
        }}
        tabIndex={-1}
        aria-hidden="true"
        className="opacity-0 pointer-events-none absolute w-4 h-4"
      >
        <option value="">{t("country_none")}</option>
        {STANDARD_COUNTRIES.map((c) => (
          <option key={c} value={c}>
            {t(`country_${c.toLowerCase()}` as Parameters<typeof t>[0])}
          </option>
        ))}
        <option value="OTHER">{t("country_other")}</option>
      </select>

      {/* Rich Cyberpunk Custom Dropdown with Flag Icons */}
      <div className="relative z-50">
        <Dropdown
          fullWidth
          align="left"
          trigger={
            <div
              className={`w-full bg-black/50 border ${country ? "border-[#bc13fe]" : "border-[#bc13fe]/30"} rounded-xl p-4 text-white font-mono text-lg hover:border-[#bc13fe] hover:shadow-[0_0_15px_rgba(188,19,254,0.3)] ${country ? "shadow-[0_0_15px_rgba(188,19,254,0.3)]" : ""} transition-all flex items-center justify-between group cursor-pointer`}
            >
              <span
                className={
                  !country ? "text-white/50" : "flex items-center gap-3"
                }
              >
                {country ? (
                  <>
                    <CountryFlag countryCode={country} />
                    <span>{getCountryName(country)}</span>
                  </>
                ) : (
                  t("country_none")
                )}
              </span>
              <svg
                className="w-5 h-5 text-[#bc13fe] group-hover:drop-shadow-[0_0_5px_rgba(188,19,254,0.8)] transition-all"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          }
        >
          <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
            {[
              { value: "", label: t("country_none") },
              ...STANDARD_COUNTRIES.map((c) => ({
                value: c,
                label: t(
                  `country_${c.toLowerCase()}` as Parameters<typeof t>[0],
                ),
              })),
              {
                value: "OTHER",
                label: t("country_other"),
              },
            ].map((option) => (
              <DropdownItem
                key={option.value}
                onClick={() => {
                  onCountryChange(option.value);
                  if (option.value !== "OTHER") {
                    onCustomCountryChange("");
                  }
                }}
                className={
                  country === option.value
                    ? "bg-[#bc13fe]/20 text-[#bc13fe] border-l-2 border-[#bc13fe]"
                    : "border-l-2 border-transparent hover:bg-white/5"
                }
              >
                {option.value && (
                  <span className="flex-shrink-0 flex items-center">
                    <CountryFlag countryCode={option.value} />
                  </span>
                )}
                <span>{option.label}</span>
              </DropdownItem>
            ))}
          </div>
        </Dropdown>
      </div>

      {country === "OTHER" && (
        <div className="mt-3">
          <input
            type="text"
            value={customCountry}
            onChange={(e) => onCustomCountryChange(e.target.value)}
            className="w-full bg-black/50 border border-[#bc13fe]/30 rounded-xl p-4 text-white font-mono text-lg focus:outline-none focus:border-[#bc13fe] focus:shadow-[0_0_15px_rgba(188,19,254,0.3)] transition-all placeholder-white/20 animate-fade-in"
            placeholder={t("placeholder_country")}
            required
            maxLength={50}
          />
        </div>
      )}
    </div>
  );
};
