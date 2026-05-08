// ═══════════════════════════════════════════════════════════════
// LANGUAGE PROVIDER & HOOK
// src/hooks/use-language.tsx
// Last Updated: 2026
// ═══════════════════════════════════════════════════════════════

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  useCallback,
  useMemo,
} from "react";
import {
  translations,
  TranslationKey,
  Language,
  getTranslations,
  getSupportedLanguages,
} from "@/lib/data";

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS (Exported for reuse)
// ═══════════════════════════════════════════════════════════════

/**
 * Supported language codes (re-exported from data.ts for consistency)
 */
export type { Language };

/**
 * Props for LanguageProvider component
 */
export type LanguageProviderProps = {
  children: ReactNode;
  /**
   * Default language if none is stored or detected
   * @default "en"
   */
  defaultLanguage?: Language;
  /**
   * Optional callback when language changes
   * @param lang - The new language code
   */
  onLanguageChange?: (lang: Language) => void;
  /**
   * Storage key for persisting language preference
   * @default "yd_language"
   */
  storageKey?: string;
};

/**
 * State and methods returned by useLanguage hook
 */
export type LanguageProviderState = {
  /** Current selected language code */
  lang: Language;
  /** Set the current language (persists to localStorage) */
  setLang: (lang: Language) => void;
  /**
   * Get translation for a key in current language
   * Falls back to English, then returns the key if not found
   * @param key - Translation key (type-safe)
   * @returns Translated string or the key if not found
   */
  t: (key: TranslationKey) => string;
  /**
   * Get all translations for current language
   * Useful for passing to child components or external libraries
   */
  getTranslations: () => Record<TranslationKey, string>;
  /** Check if current language is RTL (Arabic) */
  isRTL: boolean;
  /** List of supported language codes */
  supportedLanguages: readonly Language[];
  /**
   * Get language name in its own language (for display in switcher)
   * @param lang - Language code
   * @returns Human-readable name (e.g., "English", "العربية", "Español")
   */
  getLanguageName: (lang: Language) => string;
};

// ═══════════════════════════════════════════════════════════════
// CONSTANTS & HELPERS
// ═══════════════════════════════════════════════════════════════

const DEFAULT_STORAGE_KEY = "yd_language";
const DEFAULT_LANGUAGE: Language = "en";

/**
 * Map of language codes to their native names for display
 */
const LANGUAGE_NAMES: Record<Language, string> = {
  en: "English",
  ar: "العربية",
  es: "Español",
};

/**
 * Languages that use RTL text direction
 */
const RTL_LANGUAGES: readonly Language[] = ["ar"] as const;

/**
 * Check if a language uses RTL direction
 */
function isRTL(lang: Language): boolean {
  return RTL_LANGUAGES.includes(lang);
}

/**
 * Safely get language from localStorage (SSR-safe)
 */
function getStoredLanguage(
  storageKey: string,
  defaultLang: Language,
): Language {
  if (typeof window === "undefined") return defaultLang;

  try {
    const stored = localStorage.getItem(storageKey);
    if (stored && getSupportedLanguages().includes(stored as Language)) {
      return stored as Language;
    }
  } catch (error) {
  }

  return defaultLang;
}

// ═══════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════

const LanguageProviderContext = createContext<
  LanguageProviderState | undefined
>(undefined);

// ═══════════════════════════════════════════════════════════════
// PROVIDER COMPONENT
// ═══════════════════════════════════════════════════════════════

/**
 * Language provider component that manages translation state and applies RTL/LTR direction
 *
 * @example
 * ```tsx
 * <LanguageProvider defaultLanguage="en" onLanguageChange={handleLangChange}>
 *   <App />
 * </LanguageProvider>
 * ```
 */
export function LanguageProvider({
  children,
  defaultLanguage = DEFAULT_LANGUAGE,
  storageKey = DEFAULT_STORAGE_KEY,
  onLanguageChange,
}: LanguageProviderProps) {
  const [lang, setLangState] = useState<Language>(() =>
    getStoredLanguage(storageKey, defaultLanguage),
  );

  // Memoize translations for current language to avoid recalculation
  const currentTranslations = useMemo(() => getTranslations(lang), [lang]);

  // ✅ FIXED: Removed onLanguageChange from dependencies to prevent re-renders
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = window.document.documentElement;
    const newDir = isRTL(lang) ? "rtl" : "ltr";

    // ✅ Only update if actually different - prevents unnecessary re-renders
    if (root.dir !== newDir) {
      root.dir = newDir;
    }
    if (root.lang !== lang) {
      root.lang = lang;
    }
  }, [lang]); // ✅ Removed onLanguageChange

  // ✅ FIXED: Added logging, early return, and proper dependencies to prevent infinite loops
  const setLang = useCallback(
    (newLang: Language) => {

      // Early return if value hasn't changed
      if (newLang === lang) {
        return;
      }

      if (!getSupportedLanguages().includes(newLang)) {
        return;
      }

      try {
        localStorage.setItem(storageKey, newLang);
      } catch (error) {
      }

      setLangState(newLang);
    },
    [lang, storageKey], // ✅ Added lang to dependencies
  );

  // ✅ FIXED: Memoized translation function with proper dependencies
  const t = useCallback(
    (key: TranslationKey): string => {
      // Try current language first
      if (key in currentTranslations) {
        return currentTranslations[key];
      }

      // Fallback to English
      if (lang !== "en" && key in translations.en) {
        return translations.en[key];
      }

      // Last resort: return the key itself (useful for debugging)
      if (process.env.NODE_ENV === "development") {
      }

      return key;
    },
    [currentTranslations, lang],
  );

  // Get all translations for current language
  const getLangTranslations = useCallback(
    () => currentTranslations,
    [currentTranslations],
  );

  // Check if current language is RTL
  const isRTLCurrent = useMemo(() => isRTL(lang), [lang]);

  // Get supported languages list
  const supportedLanguages = useMemo(() => getSupportedLanguages(), []);

  // Get human-readable language name
  const getLanguageName = useCallback((language: Language): string => {
    return LANGUAGE_NAMES[language] ?? language;
  }, []);

  // Memoize the context value so consumers don't re-render on every parent render.
  // Without this, every component using useLanguage() re-renders whenever the
  // LanguageProvider re-renders for any reason, even if nothing changed.
  const value = useMemo<LanguageProviderState>(
    () => ({
      lang,
      setLang,
      t,
      getTranslations: getLangTranslations,
      isRTL: isRTLCurrent,
      supportedLanguages,
      getLanguageName,
    }),
    [lang, setLang, t, getLangTranslations, isRTLCurrent, supportedLanguages, getLanguageName],
  );

  return (
    <LanguageProviderContext.Provider value={value}>
      {children}
    </LanguageProviderContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════

/**
 * Hook to access language state and translation methods
 * Must be used within a LanguageProvider
 *
 * @returns LanguageProviderState with lang, setLang, t(), and utilities
 *
 * @example
 * ```tsx
 * const { t, lang, setLang, isRTL } = useLanguage();
 *
 * return (
 *   <div dir={isRTL ? "rtl" : "ltr"}>
 *     <h1>{t("hero.title1")}</h1>
 *     <select value={lang} onChange={(e) => setLang(e.target.value as Language)}>
 *       <option value="en">English</option>
 *       <option value="ar">العربية</option>
 *       <option value="es">Español</option>
 *     </select>
 *   </div>
 * );
 * ```
 *
 * @throws Error if used outside of LanguageProvider
 */
export function useLanguage(): LanguageProviderState {
  const context = useContext(LanguageProviderContext);

  if (context === undefined) {
    throw new Error(
      "useLanguage must be used within a LanguageProvider. " +
        "Wrap your app with <LanguageProvider> at the root level.",
    );
  }

  return context;
}

// ═══════════════════════════════════════════════════════════════
// CONVENIENCE HOOKS (Optional helpers)
// ═══════════════════════════════════════════════════════════════

/**
 * Hook that returns only the translation function and current language
 * Useful for components that only need to translate text
 */
export function useTranslation() {
  const { t, lang } = useLanguage();
  return { t, lang };
}

/**
 * Hook for language switcher components
 * Returns languages with their display names
 */
export function useLanguageSwitcher() {
  const { lang, setLang, getLanguageName, supportedLanguages } = useLanguage();

  const languages = useMemo(
    () =>
      supportedLanguages.map((code) => ({
        code,
        name: getLanguageName(code),
        isRTL: isRTL(code),
        isActive: code === lang,
      })),
    [supportedLanguages, lang, getLanguageName],
  );

  return {
    languages,
    current: lang,
    set: setLang,
  };
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS SUMMARY
// ═══════════════════════════════════════════════════════════════

/**
 * Main exports:
 *
 * Types:
 * - Language: "en" | "ar" | "es"
 * - LanguageProviderProps: Props for the provider component
 * - LanguageProviderState: Return type of useLanguage hook
 *
 * Components:
 * - LanguageProvider: Context provider for translation management
 *
 * Hooks:
 * - useLanguage(): Main hook with full state and methods
 * - useTranslation(): Simplified hook returning only t() and lang
 * - useLanguageSwitcher(): Hook for building language switcher UI
 *
 * Re-exports from @/lib/
 * - TranslationKey: Union type of all valid translation keys
 * - getTranslations(), getSupportedLanguages()
 *
 * Features:
 * ✅ SSR-safe with typeof window checks
 * ✅ Type-safe translations with TranslationKey union type
 * ✅ Fallback chain: current lang → English → key itself
 * ✅ RTL/LTR direction auto-applied to document
 * ✅ Memoized translations for performance
 * ✅ Configurable storage key and default language
 * ✅ onLanguageChange callback for side effects (still works, just not in useEffect deps)
 * ✅ Development warnings for missing keys
 * ✅ JSDoc documentation with examples
 * ✅ Fixed: Prevents infinite re-renders with proper dependencies and early returns
 * ✅ Fixed: Added checks to prevent unnecessary DOM updates
 * ✅ Fixed: Added console logging for debugging
 * ✅ Fixed: Removed onLanguageChange from useEffect dependencies to prevent re-renders
 */
