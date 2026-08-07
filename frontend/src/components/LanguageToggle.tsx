import { useLang } from "../i18n/LanguageContext";

export function LanguageToggle() {
  const { locale, setLocale } = useLang();
  const options = [
    { locale: "pt-BR" as const, label: "🇧🇷 PT", title: "Português" },
    { locale: "en-US" as const, label: "🇺🇸 EN", title: "English" },
    { locale: "es-419" as const, label: "🇲🇽 ES", title: "Español" },
  ];

  return (
    <div
      className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-100 p-0.5"
      style={{ backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" }}
      role="group"
      aria-label="Language / Idioma"
    >
      {options.map((option) => {
        const active = locale === option.locale;
        return (
          <button
            key={option.locale}
            type="button"
            onClick={() => setLocale(option.locale)}
            title={option.title}
            aria-pressed={active}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
              active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:bg-white/70 hover:text-slate-900"
            }`}
            style={{
              backgroundColor: active ? "#FFFFFF" : "transparent",
              color: active ? "#0F172A" : "#64748B",
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
