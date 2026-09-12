const styles = {
  page: {
    maxWidth: 'var(--max-width)',
    margin: '0 auto',
    padding: '0 24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '28px 0',
    borderBottom: '1px solid var(--border)',
  },
  nav: {
    display: 'flex',
    gap: 28,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    fontSize: 15,
  },
  navLink: {
    color: 'var(--text)',
    textDecoration: 'none',
  },
  hero: {
    padding: '96px 0 80px',
    borderBottom: '1px solid var(--border)',
  },
  heroTitle: {
    fontSize: 44,
    maxWidth: 640,
    marginBottom: 20,
  },
  heroText: {
    fontSize: 18,
    color: 'var(--text-muted)',
    maxWidth: 480,
    marginBottom: 32,
  },
  button: {
    display: 'inline-block',
    padding: '12px 24px',
    border: '1px solid var(--text)',
    background: 'transparent',
    color: 'var(--text)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    fontSize: 15,
    textDecoration: 'none',
  },
  section: {
    padding: '72px 0',
    borderBottom: '1px solid var(--border)',
  },
  sectionLabel: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    fontSize: 13,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    marginBottom: 16,
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 40,
    marginTop: 32,
  },
  featureNumber: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    fontSize: 14,
    color: 'var(--accent)',
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 20,
    marginBottom: 8,
  },
  aboutText: {
    maxWidth: 620,
    fontSize: 17,
  },
  footer: {
    padding: '32px 0',
    display: 'flex',
    justifyContent: 'space-between',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    fontSize: 14,
    color: 'var(--text-muted)',
  },
}

export default function App() {
  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <strong>Firmanavn</strong>
        <nav style={styles.nav}>
          <a href="#om" style={styles.navLink}>Om oss</a>
          <a href="#tjenester" style={styles.navLink}>Tjenester</a>
          <a href="#kontakt" style={styles.navLink}>Kontakt</a>
        </nav>
      </header>

      <section style={styles.hero}>
        <h1 style={styles.heroTitle}>En enkel, tydelig overskrift som forklarer hva dere gjør</h1>
        <p style={styles.heroText}>
          Kort undertekst som utdyper løftet fra overskriften. Erstatt med
          egen tekst når innholdet er klart.
        </p>
        <a href="#kontakt" style={styles.button}>Kom i gang</a>
      </section>

      <section id="tjenester" style={styles.section}>
        <div style={styles.sectionLabel}>Tjenester</div>
        <div style={styles.featureGrid}>
          <div>
            <div style={styles.featureNumber}>01</div>
            <h3 style={styles.featureTitle}>Tjeneste én</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              Kort beskrivelse av den første tjenesten eller fordelen dere tilbyr.
            </p>
          </div>
          <div>
            <div style={styles.featureNumber}>02</div>
            <h3 style={styles.featureTitle}>Tjeneste to</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              Kort beskrivelse av den andre tjenesten eller fordelen dere tilbyr.
            </p>
          </div>
          <div>
            <div style={styles.featureNumber}>03</div>
            <h3 style={styles.featureTitle}>Tjeneste tre</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              Kort beskrivelse av den tredje tjenesten eller fordelen dere tilbyr.
            </p>
          </div>
        </div>
      </section>

      <section id="om" style={styles.section}>
        <div style={styles.sectionLabel}>Om oss</div>
        <p style={styles.aboutText}>
          Her kan dere skrive litt om bakgrunnen deres, hva dere står for, og
          hvorfor noen bør velge nettopp dere. Hold det kort og konkret —
          én til to avsnitt er ofte nok.
        </p>
      </section>

      <section id="kontakt" style={{ ...styles.section, borderBottom: 'none' }}>
        <div style={styles.sectionLabel}>Kontakt</div>
        <p style={styles.aboutText}>
          Ta kontakt på{' '}
          <a href="mailto:post@firmanavn.no">post@firmanavn.no</a> eller ring{' '}
          00 00 00 00.
        </p>
      </section>

      <footer style={styles.footer}>
        <span>© {new Date().getFullYear()} Firmanavn</span>
        <span>Org.nr. 000 000 000</span>
      </footer>
    </div>
  )
}
