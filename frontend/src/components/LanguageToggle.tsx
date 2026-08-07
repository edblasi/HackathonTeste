import { useState } from "react";
import { useLang } from "../i18n/LanguageContext";

export function LanguageToggle() {
  const { locale, setLocale } = useLang();
  const [hoveredLocale, setHoveredLocale] = useState<string | null>(null);
  const options = [
    { locale: "pt-BR" as const, label: "🇧🇷 PT", title: "Português" },
    { locale: "en-US" as const, label: "🇺🇸 EN", title: "English" },
    { locale: "es-419" as const, label: "🇲🇽 ES", title: "Español" },
  ];

  return (
    <div
      className="flex items-center gap-0.5 rounded-lg border p-0.5"
      style={{ backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" }}
      role="group"
      aria-label="Language / Idioma"
    >
      {options.map((option) => {
        const active = locale === option.locale;
        const hovered = hoveredLocale === option.locale;
        return (
          <button
            key={option.locale}
            type="button"
            onClick={() => setLocale(option.locale)}
            onMouseEnter={() => setHoveredLocale(option.locale)}
            onMouseLeave={() => setHoveredLocale(null)}
            onFocus={() => setHoveredLocale(option.locale)}
            onBlur={() => setHoveredLocale(null)}
            title={option.title}
            aria-pressed={active}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition-all"
            style={{
              backgroundColor: active || hovered ? "#FFFFFF" : "transparent",
              color: active || hovered ? "#0F172A" : "#64748B",
              boxShadow: active ? "0 1px 2px rgba(15, 23, 42, 0.08)" : "none",
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
