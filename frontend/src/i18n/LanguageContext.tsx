import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import translations, { type Locale, type TranslationKey } from "./translations";

// ─── Detect browser locale ─────────────────────────────────────────────────────
function detectLocale(): Locale {
  const savedLocale = window.localStorage.getItem("umdr-locale");
  if (savedLocale === "pt-BR" || savedLocale === "en-US" || savedLocale === "es-419") return savedLocale;

  const lang = navigator.language || navigator.languages?.[0] || "pt-BR";
  if (lang.startsWith("en")) return "en-US";
  if (lang.startsWith("es")) return "es-419";
  return "pt-BR";
}

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

interface LangContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(detectLocale);

  useEffect(() => {
    window.localStorage.setItem("umdr-locale", locale);
    document.documentElement.lang = locale;
  }, [locale]);

  function t(key: TranslationKey, params?: Record<string, string | number>): string {
    let value = getByPath(translations[locale], key);
    if (typeof value !== "string") value = getByPath(translations["pt-BR"], key);
    if (typeof value !== "string") value = key;

    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        value = (value as string).replace(`{${paramKey}}`, String(paramValue));
      }
    }
    return value as string;
  }

  return (
    <LangContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside <LanguageProvider>");
  return ctx;
}