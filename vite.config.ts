import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { configurationIssue } from './src/lib/config.ts'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const url = env.VITE_SUPABASE_URL?.trim()
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

  // Rejeita credenciais privilegiadas antes de gerar JavaScript público.
  if (url || key) {
    const issue = configurationIssue(url, key)
    if (issue) throw new Error(issue)
  }

  return {
    base: process.env.RIVFI_BASE_PATH || '/',
    plugins: [react()],
  }
})
