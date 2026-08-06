import ptBR from "./locales/pt-BR.json";
import enUS from "./locales/en-US.json";
import es419 from "./locales/es-419.json";

const translations = {
  "pt-BR": ptBR,
  "en-US": enUS,
  "es-419": es419,
} as const;

export default translations;

export type Locale = keyof typeof translations;

type PathsToStringProps<T> = T extends string
  ? []
  : {
      [K in Extract<keyof T, string>]: [K, ...PathsToStringProps<T[K]>];
    }[Extract<keyof T, string>];

type Join<T extends string[]> = T extends []
  ? never
  : T extends [infer F extends string]
    ? F
    : T extends [infer F extends string, ...infer R extends string[]]
      ? `${F}.${Join<R>}`
      : string;

export type TranslationKey = Join<PathsToStringProps<typeof ptBR>>;