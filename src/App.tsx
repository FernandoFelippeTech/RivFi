import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, configurationError } from './lib/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [recovering, setRecovering] = useState(false)
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (!supabase) return
    let active = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) setError('Não foi possível recuperar sua sessão. Recarregue a página e tente novamente.')
      else setSession(data.session)
      setLoading(false)
    }).catch(() => { if (active) { setError('Não foi possível consultar sua sessão. Verifique a conexão.'); setLoading(false) } })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      setSession(newSession)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  if (configurationError) return <main className="setup panel"><h1>RivFi</h1><h2>Vamos conectar seus dados</h2><p>{configurationError}</p><p>O aplicativo precisa de uma conexão configurada com o Supabase para autenticar e sincronizar. Consulte o README do projeto.</p></main>
  if (loading) return <main className="setup" role="status">Carregando RivFi…</main>
  if (error) return <main className="setup panel"><p role="alert">{error}</p><button onClick={() => window.location.reload()}>Tentar novamente</button></main>
  if (recovering && session) return <main className="setup panel"><h1>Definir nova senha</h1><form onSubmit={async e => { e.preventDefault(); setLoading(true); try { const { error } = await supabase!.auth.updateUser({ password }); if (error) throw error; setRecovering(false); setPassword('') } catch { setError('Não foi possível atualizar a senha. Solicite um novo link de recuperação.') } finally { setLoading(false) } }}><label>Nova senha<input type="password" minLength={12} autoComplete="new-password" required value={password} onChange={e => setPassword(e.target.value)} /></label><button className="primary">Atualizar senha</button></form></main>
  return session ? <Dashboard key={session.user.id} userId={session.user.id} /> : <Login />
}

export default App
