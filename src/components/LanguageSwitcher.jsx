import { LANGUAGES } from 'config/compliance';
import { useT } from 'lib/i18n';

/**
 * Language picker for notices and consent requests (DPDP Act s.5(3), s.6(3)).
 */
const LanguageSwitcher = ({ className = '' }) => {
  const { language, setLanguage, t } = useT();

  return (
    <div className={`d-flex align-items-center flex-wrap gap-2 ${className}`}>
      <span className="fs-14 lato" id="language-switcher-label">
        <i className="uil uil-language me-1" aria-hidden="true" />
        {t('common.language')}:
      </span>
      <div className="btn-group btn-group-sm" role="group" aria-labelledby="language-switcher-label">
        {LANGUAGES.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            lang={code}
            className={`btn btn-sm ${language === code ? 'bg-theme-dark text-white' : 'btn-white border text-title'}`}
            aria-pressed={language === code}
            onClick={() => setLanguage(code)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSwitcher;
