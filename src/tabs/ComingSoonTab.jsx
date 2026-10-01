// Placeholder for tabs that are planned but not built yet. Says so plainly
// instead of showing demo data.
export default function ComingSoonTab({ tab, t, onBack }) {
  return (
    <main className="wrap">
      <section className="soon-panel">
        <h1>{t(`soonTitle_${tab}`)}</h1>
        <p>{t(`soonBody_${tab}`)}</p>
        <p><button type="button" className="btn" onClick={onBack}>{t('soonBack')}</button></p>
      </section>
    </main>
  );
}
