/**
 * Language selection for notices and consent requests. DPDP Act s.5(3) and s.6(3):
 * the notice and the consent request must be available in English or any language
 * in the Eighth Schedule to the Constitution.
 *
 * The choice is kept in memory; it is remembered across visits (`dpdp_lang` cookie)
 * only if the visitor has allowed functional cookies.
 */
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import locales from 'locales/index';
import {
  CLINIC,
  CONTACT_PERSON,
  DATA_PROTECTION_BOARD,
  DEFAULT_LANGUAGE,
  GRIEVANCE_RESPONSE_DAYS,
  LANGUAGES,
  NOTICE_VERSION,
  OTP
} from 'config/compliance';
import { useConsent } from './consentStore';

const LANG_COOKIE = 'dpdp_lang';
const ONE_YEAR = 365 * 24 * 60 * 60;

// Values available to every string as {placeholders}.
const GLOBAL_VARS = {
  clinic: CLINIC.tradeName,
  legalName: CLINIC.legalName,
  board: DATA_PROTECTION_BOARD.name,
  grievanceDays: GRIEVANCE_RESPONSE_DAYS,
  days: GRIEVANCE_RESPONSE_DAYS,
  minutes: OTP.ttlMinutes,
  version: NOTICE_VERSION,
  name: CONTACT_PERSON.name,
  designation: CONTACT_PERSON.designation,
  email: CONTACT_PERSON.email,
  phone: CONTACT_PERSON.phone
};

const lookup = (dict, key) => key.split('.').reduce((node, part) => (node ? node[part] : undefined), dict);

export const translate = (language, key, vars = {}) => {
  const value = lookup(locales[language], key) ?? lookup(locales[DEFAULT_LANGUAGE], key);
  if (typeof value !== 'string') return value ?? key;
  const all = { ...GLOBAL_VARS, ...vars };
  return value.replace(/\{(\w+)\}/g, (match, name) => (name in all ? String(all[name]) : match));
};

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const { choices } = useConsent();
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE);

  useEffect(() => {
    const saved = document.cookie.split('; ').find((c) => c.startsWith(`${LANG_COOKIE}=`));
    const code = saved?.split('=')[1];
    if (code && LANGUAGES.some((l) => l.code === code)) setLanguageState(code);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback(
    (code) => {
      if (!LANGUAGES.some((l) => l.code === code)) return;
      setLanguageState(code);
      if (choices.functional) {
        const secure = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `${LANG_COOKIE}=${code}; Max-Age=${ONE_YEAR}; Path=/; SameSite=Lax${secure}`;
      }
    },
    [choices.functional]
  );

  const value = useMemo(
    () => ({ language, setLanguage, t: (key, vars) => translate(language, key, vars) }),
    [language, setLanguage]
  );

  return createElement(LanguageContext.Provider, { value }, children);
};

export const useT = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useT must be used inside LanguageProvider');
  return context;
};
