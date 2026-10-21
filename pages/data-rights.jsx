/**
 * Data Principal rights portal. DPDP Act s.11–s.14, s.6(4); DPDP Rules 2025, Rule 14
 * (identifier + verification, response period, nomination) and Rule 9 (contact person).
 */
import { Fragment, useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { useT } from 'lib/i18n';
import PageHeader from 'components/PageHeader';
import LanguageSwitcher from 'components/LanguageSwitcher';
import VerifyIdentity from 'components/VerifyIdentity';
import RightsDashboard from 'components/RightsDashboard';
import ContactBlock from 'components/ContactBlock';

const DataRights = () => {
  const { t } = useT();
  const [state, setState] = useState({ loading: true, summary: null, notice: '' });

  const loadSummary = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const response = await fetch('/api/rights/me');
    const data = response.ok ? await response.json() : null;
    setState({ loading: false, summary: data?.summary || null, notice: '' });
  }, []);

  useEffect(() => {
    fetch('/api/rights/session')
      .then((r) => r.json())
      .then((s) => (s.verified ? loadSummary() : setState({ loading: false, summary: null, notice: '' })))
      .catch(() => setState({ loading: false, summary: null, notice: '' }));
  }, [loadSummary]);

  return (
    <Fragment>
      <Head>
        <title>{`${t('rights.title')} | Dental Clinic`}</title>
        <meta name="robots" content="noindex" />
      </Head>
      <PageHeader title={t('rights.title')} subtitle={t('rights.intro')} />
      <section className="wrapper">
        <div className="container py-10 py-md-12">
          <div className="row justify-content-center">
            <div className="col-lg-10 col-xl-9">
              <div className="d-flex justify-content-end mb-4">
                <LanguageSwitcher />
              </div>
              {state.notice && (
                <div className="alert alert-success lato" role="status">
                  {state.notice}
                </div>
              )}
              {state.loading ? (
                <p className="lato">{t('common.loading')}</p>
              ) : state.summary ? (
                <RightsDashboard
                  summary={state.summary}
                  onSummary={(summary) => setState((s) => ({ ...s, summary }))}
                  onSignedOut={(result) =>
                    setState({ loading: false, summary: null, notice: result?.fullyErased ? t('rights.fullyErased') : '' })
                  }
                />
              ) : (
                <VerifyIdentity onVerified={loadSummary} />
              )}
              <div className="border rounded p-4 bg-grays mt-4">
                <ContactBlock />
              </div>
            </div>
          </div>
        </div>
      </section>
    </Fragment>
  );
};

export default DataRights;
