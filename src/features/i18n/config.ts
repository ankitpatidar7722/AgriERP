export type Lang = "en" | "hi" | "hg";

export const LANGUAGES: { code: Lang; label: string; short: string }[] = [
  { code: "en", label: "English", short: "EN" },
  { code: "hi", label: "हिंदी", short: "हिं" },
  { code: "hg", label: "Hinglish", short: "HG" },
];

export const LANG_STORAGE_KEY = "agrierp.lang";
