import { DATA_PROTECTION_BOARD } from 'config/compliance';
import { useT } from 'lib/i18n';

/**
 * Link to the Data Protection Board's complaint route. The official URL has not been
 * verified, so until DATA_PROTECTION_BOARD.url is set this shows plain text instead of
 * guessing a link (complaints to the Board apply from about May 2027: DPDP Act s.13(3), s.27).
 */
const BoardLink = ({ className = '' }) => {
  const { t } = useT();
  if (!DATA_PROTECTION_BOARD.url) {
    return (
      <span className={className}>
        {t('notice.links.board')} ({t('common.boardLinkPending')})
      </span>
    );
  }
  return (
    <a href={DATA_PROTECTION_BOARD.url} target="_blank" rel="noopener noreferrer" className={className}>
      {t('notice.links.board')}
    </a>
  );
};

export default BoardLink;
