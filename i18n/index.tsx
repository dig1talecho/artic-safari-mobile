import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { resources, LANGUAGES, type Language, type Translations } from "./translations";

export { LANGUAGES };
export type { Language, Translations };

const STORAGE_KEY = "artic-safari.language";

/**
 * Best-effort device language. Intl is available on iOS JSC and on Hermes
 * builds with Intl enabled, but not guaranteed everywhere — hence the
 * try/catch and the English default rather than assuming it exists.
 * (This project's app.json currently sets enableHermes: false.)
 */
function detectDeviceLanguage(): Language {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? "";
    if (locale.toLowerCase().startsWith("nb") || locale.toLowerCase().startsWith("no")) {
      return "no";
    }
  } catch {
    // Intl unavailable — fall through to the default.
  }
  return "en";
}

/** Dot-path keys into the translation tree, e.g. "booking.confirm". */
type Leaves<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type TranslationKey = Leaves<Translations>;

function resolve(tree: unknown, path: string): string | undefined {
  const value = path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, tree);
  return typeof value === "string" ? value : undefined;
}

/** Replaces {{name}} placeholders. */
function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) =>
    key in vars ? String(vars[key]) : match
  );
}

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  /** False until the persisted choice has been read, so the UI can avoid a flash. */
  ready: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(detectDeviceLanguage);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!active) return;
        if (stored === "en" || stored === "no") setLanguageState(stored);
        setReady(true);
      })
      .catch(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    AsyncStorage.setItem(STORAGE_KEY, lang).catch(() => {
      // Persisting is a nicety; an in-memory switch still works this session.
    });
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      const active = resolve(resources[language], key);
      // Fall back to English rather than rendering a raw key at the guest.
      const fallback = active ?? resolve(resources.en, key);
      if (fallback === undefined) {
        if (__DEV__) console.warn(`[i18n] Missing translation key: ${key}`);
        return key;
      }
      return interpolate(fallback, vars);
    },
    [language]
  );

  const value = useMemo(
    () => ({ language, setLanguage, t, ready }),
    [language, setLanguage, t, ready]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslation must be used inside <I18nProvider>");
  return ctx;
}

/** Norwegian uses a comma decimal separator and space grouping: 15 000 kr. */
export function formatCurrency(amount: number, language: Language): string {
  const grouped = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, language === "no" ? " " : ",");
  return `${grouped} kr`;
}
