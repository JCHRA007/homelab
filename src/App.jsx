import { useEffect, useState } from 'react'
import portrait from './assets/john-portrait.jpg'
import { supabase } from './supabaseClient'

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
  brand: {
    fontFamily: 'var(--font-heading)',
    fontSize: 19,
  },
  nav: {
    display: 'flex',
    gap: 28,
    fontSize: 15,
  },
  navLink: {
    color: 'var(--text)',
    textDecoration: 'none',
  },
  hero: {
    padding: '88px 0 76px',
    borderBottom: '1px solid var(--border)',
  },
  eyebrow: {
    fontSize: 14,
    color: 'var(--text-muted)',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 42,
    maxWidth: 620,
    marginBottom: 20,
  },
  heroText: {
    fontSize: 17,
    color: 'var(--text-muted)',
    maxWidth: 480,
    marginBottom: 32,
  },
  button: {
    display: 'inline-block',
    padding: '13px 24px',
    border: 'none',
    borderRadius: 3,
    background: 'var(--accent)',
    color: '#fff',
    fontSize: 15,
    textDecoration: 'none',
  },
  section: {
    padding: '64px 0',
    borderBottom: '1px solid var(--border)',
  },
  sectionLabel: {
    fontSize: 13,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    marginBottom: 24,
  },
  serviceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 20,
  },
  serviceCard: {
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: 20,
    background: '#fff',
  },
  serviceHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceTitle: {
    fontSize: 17,
    fontWeight: 600,
  },
  statusDot: (color) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    color: 'var(--text-muted)',
  }),
  dot: (color) => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: color,
    display: 'inline-block',
  }),
  aboutCard: {
    display: 'flex',
    gap: 24,
    alignItems: 'center',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: 24,
    background: '#fff',
    flexWrap: 'wrap',
  },
  portrait: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    objectFit: 'cover',
    border: '1px solid var(--border)',
  },
  aboutText: {
    flex: 1,
    minWidth: 200,
  },
  footer: {
    padding: '32px 0',
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 14,
    color: 'var(--text-muted)',
  },
}

const services = [
  {
    name: 'Supabase',
    description: 'Selvhostet auth og database for kommende prosjekter.',
    status: 'ok',
  },
  {
    name: 'Nettverksovervåking',
    description: 'Placeholder — legg inn din egen tjeneste her.',
    status: 'ok',
  },
  {
    name: 'Mediaserver',
    description: 'Placeholder — legg inn din egen tjeneste her.',
    status: 'ok',
  },
]

const statusColor = {
  ok: '#3d7a4f',
  warn: '#b8862b',
  down: '#a4342a',
}

const DEVICE_REFRESH_MS = 60 * 60 * 1000

function useDeviceStatus(deviceId) {
  const [row, setRow] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let active = true

    const fetchStatus = () => {
      supabase
        .from('device_status')
        .select('*')
        .eq('device_id', deviceId)
        .maybeSingle()
        .then(({ data }) => {
          if (active) {
            setRow(data)
            setLoaded(true)
          }
        })
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, DEVICE_REFRESH_MS)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [deviceId])

  return { row, loaded }
}

const UPS_STALE_MS = 90 * 60 * 1000

function upsStatusInfo(row) {
  if (!row) {
    return { label: 'Ukjent', status: 'warn', detail: 'Ingen data mottatt ennå.' }
  }

  const age = Date.now() - new Date(row.updated_at).getTime()
  const metrics = [
    row.battery_charge != null ? `${row.battery_charge}% batteri` : null,
    row.load_percent != null ? `${row.load_percent}% last` : null,
  ].filter(Boolean).join(', ')

  if (age > UPS_STALE_MS) {
    return {
      label: 'Frakoblet',
      status: 'down',
      detail: `Ingen oppdatering siden ${new Date(row.updated_at).toLocaleString('no-NO')}.`,
    }
  }
  if (row.status?.includes('OB')) {
    return { label: 'På batteri', status: 'warn', detail: metrics }
  }
  if (row.status?.includes('OL')) {
    return { label: 'Oppe', status: 'ok', detail: metrics }
  }
  return { label: row.status ?? 'Ukjent', status: 'warn', detail: metrics }
}

function UpsServiceCard() {
  const { row, loaded } = useDeviceStatus('ups')
  const info = loaded ? upsStatusInfo(row) : { label: 'Laster …', status: 'warn', detail: '' }

  return (
    <div style={styles.serviceCard}>
      <div style={styles.serviceHead}>
        <span style={styles.serviceTitle}>UPS (strøm)</span>
        <span style={styles.statusDot()}>
          <span style={styles.dot(statusColor[info.status])} />
          {info.label}
        </span>
      </div>
      <p style={{ color: 'var(--text-muted)', margin: 0 }}>
        APC Back-UPS BX950MI.
        {info.detail ? <><br />{info.detail}</> : ''}
      </p>
    </div>
  )
}

const HOMEY_STALE_MS = 90 * 60 * 1000

function homeyStatusInfo(row) {
  if (!row) {
    return { label: 'Ukjent', status: 'warn', detail: 'Ingen data mottatt ennå.' }
  }

  const age = Date.now() - new Date(row.updated_at).getTime()
  if (age > HOMEY_STALE_MS) {
    return {
      label: 'Frakoblet',
      status: 'down',
      detail: `Ingen oppdatering siden ${new Date(row.updated_at).toLocaleString('no-NO')}.`,
    }
  }

  const temp = row.raw?.temperature
  const freemem = row.raw?.freemem_percent
  const metrics = [
    temp != null ? `${temp}°C` : null,
    freemem != null ? `${freemem}% ledig minne` : null,
  ].filter(Boolean).join(', ')

  if (row.status === 'online') {
    return { label: 'Oppe', status: 'ok', detail: metrics }
  }
  return { label: 'Nede', status: 'down', detail: metrics }
}

function HomeyServiceCard({ deviceId, title }) {
  const { row, loaded } = useDeviceStatus(deviceId)
  const info = loaded ? homeyStatusInfo(row) : { label: 'Laster …', status: 'warn', detail: '' }

  return (
    <div style={styles.serviceCard}>
      <div style={styles.serviceHead}>
        <span style={styles.serviceTitle}>{title}</span>
        <span style={styles.statusDot()}>
          <span style={styles.dot(statusColor[info.status])} />
          {info.label}
        </span>
      </div>
      <p style={{ color: 'var(--text-muted)', margin: 0 }}>
        Homey Pro.
        {info.detail ? <><br />{info.detail}</> : ''}
      </p>
    </div>
  )
}

const POWER_STALE_MS = 90 * 60 * 1000

function formatWatt(watts) {
  if (watts == null) return null
  return Math.abs(watts) >= 1000 ? `${(watts / 1000).toFixed(2)} kW` : `${Math.round(watts)} W`
}

function powerStatusInfo(row) {
  if (!row) {
    return { label: 'Ukjent', status: 'warn', detail: 'Ingen data mottatt ennå.' }
  }

  const age = Date.now() - new Date(row.updated_at).getTime()
  if (age > POWER_STALE_MS) {
    return {
      label: 'Frakoblet',
      status: 'down',
      detail: `Ingen oppdatering siden ${new Date(row.updated_at).toLocaleString('no-NO')}.`,
    }
  }

  const watt = formatWatt(row.raw?.watts)
  const kwhToday = row.raw?.kwh_today
  const metrics = [
    watt,
    kwhToday != null ? `${kwhToday} kWh i dag` : null,
  ].filter(Boolean).join(', ')

  return { label: watt ?? 'Oppe', status: 'ok', detail: kwhToday != null ? `${kwhToday} kWh i dag` : '' }
}

function PowerServiceCard({ deviceId, title, subtitle }) {
  const { row, loaded } = useDeviceStatus(deviceId)
  const info = loaded ? powerStatusInfo(row) : { label: 'Laster …', status: 'warn', detail: '' }

  return (
    <div style={styles.serviceCard}>
      <div style={styles.serviceHead}>
        <span style={styles.serviceTitle}>{title}</span>
        <span style={styles.statusDot()}>
          <span style={styles.dot(statusColor[info.status])} />
          {info.label}
        </span>
      </div>
      <p style={{ color: 'var(--text-muted)', margin: 0 }}>
        {subtitle}
        {info.detail ? <><br />{info.detail}</> : ''}
      </p>
    </div>
  )
}

export default function App() {
  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <span style={styles.brand}>Atkins Homelab</span>
        <nav style={styles.nav}>
          <a href="#tjenester" style={styles.navLink}>Tjenester</a>
          <a href="#om" style={styles.navLink}>Om</a>
        </nav>
      </header>

      <section style={styles.hero}>
        <div style={styles.eyebrow}>Bergen, Norge</div>
        <h1 style={styles.heroTitle}>Et hjemmenettverk driftet med samme nøyaktighet som jobben</h1>
        <p style={styles.heroText}>
          Her samles status og lenker til tjenestene som kjører i mitt
          hjemmenettverk — fra selvhostet Supabase til småprosjekter under utvikling.
        </p>
        <a href="#tjenester" style={styles.button}>Se tjenester</a>
      </section>

      <section id="tjenester" style={styles.section}>
        <div style={styles.sectionLabel}>Tjenester</div>
        <div style={styles.serviceGrid}>
          {services.map((service) => (
            <div key={service.name} style={styles.serviceCard}>
              <div style={styles.serviceHead}>
                <span style={styles.serviceTitle}>{service.name}</span>
                <span style={styles.statusDot()}>
                  <span style={styles.dot(statusColor[service.status])} />
                  Oppe
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>{service.description}</p>
            </div>
          ))}
          <UpsServiceCard />
          <HomeyServiceCard deviceId="homey-home" title="Homey (@Home)" />
          <HomeyServiceCard deviceId="homey-hytta" title="Homey (@Hytta)" />
          <PowerServiceCard deviceId="home-power-consumption" title="Strømforbruk" subtitle="Puls Nordås." />
          <PowerServiceCard deviceId="home-power-production" title="Solproduksjon" subtitle="Inverter: Solceller." />
        </div>
      </section>

      <section id="om" style={{ ...styles.section, borderBottom: 'none' }}>
        <div style={styles.sectionLabel}>Om drifteren</div>
        <div style={styles.aboutCard}>
          <img src={portrait} alt="John Chr. Atkins" style={styles.portrait} />
          <div style={styles.aboutText}>
            <p style={{ margin: '0 0 4px', fontWeight: 600 }}>John Chr. Atkins</p>
            <p style={{ margin: '0 0 12px', color: 'var(--text-muted)' }}>
              IKT-leder som driver hjemmenettverket på fritiden.
            </p>
            <a href="https://www.atkins.no" target="_blank" rel="noreferrer">
              Besøk atkins.no →
            </a>
          </div>
        </div>
      </section>

      <footer style={styles.footer}>
        <span>© {new Date().getFullYear()} Atkins Homelab</span>
        <a href="https://www.atkins.no" target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)' }}>
          atkins.no
        </a>
      </footer>
    </div>
  )
}
