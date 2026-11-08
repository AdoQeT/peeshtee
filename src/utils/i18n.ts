import { tr } from './locales/tr';
import { en } from './locales/en';
import { de } from './locales/de';
import { es } from './locales/es';

export type Language = 'tr' | 'en' | 'de' | 'es';

const STORAGE_KEY = 'project_p_lang';
const listeners = new Set<(lang: Language) => void>();

export function getLanguage(): Language {
  if (typeof window === 'undefined') return 'tr';
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'en' || saved === 'tr' || saved === 'de' || saved === 'es' ? saved : 'tr';
}

export function setLanguage(lang: Language): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, lang);
  listeners.forEach(cb => {
    try {
      cb(lang);
    } catch {}
  });
}

export function onLanguageChange(cb: (lang: Language) => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getRandomBotNames(count: number, lang: Language = getLanguage()): string[] {
  const pool = [...(translations[lang]?.botNames || translations.tr.botNames)];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export const translations = { tr, en, de, es };
