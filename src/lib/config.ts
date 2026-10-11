export function configurationIssue(url?: string, key?: string): string {
  if (!url || !key) {
    return 'Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no arquivo .env.local e reinicie o servidor.'
  }

  let publicKey = key.startsWith('sb_publishable_') && key.length > 'sb_publishable_'.length
  if (!publicKey) {
    try {
      const payload = key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
      publicKey = JSON.parse(atob(payload)).role === 'anon'
    } catch {
      publicKey = false
    }
  }

  return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url) && publicKey
    ? ''
    : 'Configuração inválida. Use a URL HTTPS do projeto e somente a chave pública (publishable ou anon).'
}
