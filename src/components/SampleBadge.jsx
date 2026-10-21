import { IS_SAMPLE } from 'config/compliance';
import { useT } from 'lib/i18n';

/**
 * Shown beside every contact block while the organisation details in
 * src/config/compliance.js are fictitious samples, so no page presents them as genuine
 * (REQUIREMENTS §4D).
 */
const SampleBadge = ({ className = '' }) => {
  const { t } = useT();
  if (!IS_SAMPLE) return null;
  return (
    <span className={`badge bg-warning text-dark fw-normal ${className}`} role="note">
      {t('common.sampleBadge')}
    </span>
  );
};

export default SampleBadge;
