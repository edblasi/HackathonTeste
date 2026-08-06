import { useLang } from "../i18n/LanguageContext";

export function LanguageToggle() {
  const { locale, setLocale } = useLang();
  return (
    <div className="flex items-center gap-0.5 bg-muted p-0.5 rounded-lg">
      <button
        onClick={() => setLocale("pt-BR")}
        title="Português"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
          locale === "pt-BR" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        🇧🇷 PT
      </button>
      <button
        onClick={() => setLocale("en-US")}
        title="English"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
          locale === "en-US" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        🇺🇸 EN
      </button>
      <button
        onClick={() => setLocale("es-419")}
        title="Español"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
          locale === "es-419" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        🇲🇽 ES
      </button>
    </div>
  );
}