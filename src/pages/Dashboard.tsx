import { supabase } from '../lib/supabase'

function Dashboard() {
  async function handleLogout() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Erro ao sair:', error.message)
    }
  }

  return (
    <main>
      <h1>RivFi</h1>
      <h2>Dashboard</h2>

      <p>Você está autenticado.</p>

      <button type="button" onClick={handleLogout}>
        Sair
      </button>
    </main>
  )
}

export default Dashboard