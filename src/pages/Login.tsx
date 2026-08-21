import { useState } from 'react'
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { supabase } from '../lib/supabase'
import rivfiLogo from '../assets/rivfi-logo.png'
import '../styles/Login.css'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage('E-mail ou senha inválidos.')
      setLoading(false)
      return
    }

    setLoading(false)
  }

  return (
    <main className="login-page">
      <div className="login-glow login-glow-one" />
      <div className="login-glow login-glow-two" />

      <section className="login-container">
        {/* PAINEL DE LOGIN */}
        <div className="login-panel">
          <div className="brand">
            <img
              src={rivfiLogo}
              alt="Símbolo RivFi"
              className="brand-logo"
            />

            <span className="brand-name">
              Riv<span>Fi</span>
            </span>
          </div>

          <div className="login-content">
            <div className="login-heading">
              <span className="eyebrow">ACESSO SEGURO</span>

              <h1>Bem-vindo de volta</h1>

              <p>Entre na sua conta para continuar.</p>
            </div>

            <form className="login-form" onSubmit={handleLogin}>
              <div className="field-group">
                <label htmlFor="email">E-mail</label>

                <div className="input-wrapper">
                  <Mail size={18} />

                  <input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="field-group">
                <div className="password-label">
                  <label htmlFor="password">Senha</label>

                  <button
                    type="button"
                    className="forgot-password"
                  >
                    Esqueceu sua senha?
                  </button>
                </div>

                <div className="input-wrapper">
                  <LockKeyhole size={18} />

                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowPassword((current) => !current)
                    }
                    aria-label={
                      showPassword
                        ? 'Ocultar senha'
                        : 'Mostrar senha'
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {message && (
                <p className="login-message">
                  {message}
                </p>
              )}

              <button
                className="login-button"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <span className="spinner" />
                ) : (
                  'Entrar'
                )}
              </button>
            </form>
          </div>

          <p className="login-footer">
            © 2026 RivFi. Seu dinheiro em movimento.
          </p>
        </div>

        {/* PAINEL VISUAL */}
        <div className="visual-panel">
          <div className="visual-grid" />

          <div className="hero-logo-wrapper">
            <img
              src={rivfiLogo}
              alt=""
              aria-hidden="true"
              className="hero-logo"
            />
          </div>

          <div className="visual-copy">
            <span>RIVFI</span>

            <h2>
              Inteligência para colocar
              <br />
              seu dinheiro em <strong>movimento.</strong>
            </h2>

            <p>
              Controle, clareza e tecnologia para uma vida financeira
              mais inteligente.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

export default Login