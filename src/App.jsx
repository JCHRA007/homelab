import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function App() {
  const [session, setSession] = useState(null)
  const [loadingSession, setLoadingSession] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoadingSession(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  if (loadingSession) return <p style={{ padding: 24 }}>Laster...</p>

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Mine Chatter</h1>
      {session ? <ChatApp session={session} /> : <Auth />}
    </div>
  )
}

function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)

    const action =
      mode === 'signin'
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password })

    const { error } = await action
    setBusy(false)

    if (error) {
      setError(error.message)
    } else if (mode === 'signup') {
      setInfo('Konto opprettet. Sjekk e-post for bekreftelse hvis det kreves, eller logg inn direkte.')
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input
        type="email"
        placeholder="E-post"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Passord"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={6}
      />
      <button type="submit" disabled={busy}>
        {mode === 'signin' ? 'Logg inn' : 'Registrer'}
      </button>
      <button
        type="button"
        onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        style={{ background: 'none', border: 'none', color: '#0066cc', cursor: 'pointer' }}
      >
        {mode === 'signin' ? 'Har ikke konto? Registrer deg' : 'Har allerede konto? Logg inn'}
      </button>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {info && <p style={{ color: 'green' }}>{info}</p>}
    </form>
  )
}

function ChatApp({ session }) {
  const [chats, setChats] = useState([])
  const [content, setContent] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadChats() {
    setLoading(true)
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setChats(data)
    setLoading(false)
  }

  useEffect(() => {
    loadChats()
  }, [])

  async function handleAdd(e) {
    e.preventDefault()
    if (!content.trim()) return

    const { error } = await supabase
      .from('chats')
      .insert({ content, user_id: session.user.id })

    if (error) setError(error.message)
    else {
      setContent('')
      loadChats()
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p>Innlogget som {session.user.email}</p>
        <button onClick={() => supabase.auth.signOut()}>Logg ut</button>
      </div>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        <input
          type="text"
          placeholder="Skriv en chat-melding..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit">Lagre</button>
      </form>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      {loading ? (
        <p>Laster chatter...</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {chats.map((chat) => (
            <li
              key={chat.id}
              style={{ borderBottom: '1px solid #eee', padding: '8px 0' }}
            >
              <div>{chat.content}</div>
              <small style={{ color: '#888' }}>
                {new Date(chat.created_at).toLocaleString('no-NO')}
              </small>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
