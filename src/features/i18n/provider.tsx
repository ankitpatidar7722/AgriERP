"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { dict } from "./dictionary";
import { LANG_STORAGE_KEY, type Lang } from "./config";

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Translate a key; falls back to English, then the given fallback, then the key. */
  t: (key: string, fallback?: string) => string;
}

const LangContext = createContext<LangContextValue>({
  lang: "en",
  setLang: () => {},
  t: (key, fallback) => fallback ?? key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // SSR + first client render use English; the saved choice is applied in the
  // effect below to avoid a hydration mismatch.
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY) as Lang | null;
    if (saved === "en" || saved === "hi" || saved === "hg") setLangState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "hi" ? "hi" : "en";
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    window.localStorage.setItem(LANG_STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (key: string, fallback?: string) => {
      const entry = dict[key];
      if (!entry) return fallback ?? key;
      return entry[lang] || entry.en || fallback || key;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

/** Convenience: just the translate function. */
export function useT() {
  return useContext(LangContext).t;
}
