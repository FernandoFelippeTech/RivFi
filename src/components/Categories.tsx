import { useState } from 'react'
import type { Category } from '../lib/finance'
import { normalize } from '../lib/finance'
import { friendlyError } from '../lib/repository'
export default function Categories({ categories, onSave, disabled }: { categories: Category[]; onSave: (c: Category, previous?: Category) => Promise<void>; disabled: boolean }) {
  const [editing, setEditing] = useState<Category | null>(null)
  const [name, setName] = useState(''), [keywords, setKeywords] = useState('')
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [newId, setNewId] = useState(() => crypto.randomUUID())
  async function save(c: Category, previous?: Category) {
    setBusy(true); setError('')
    try { await onSave(c, previous); setEditing(null); setName(''); setKeywords(''); setNewId(crypto.randomUUID()) } catch(e) { setError(friendlyError(e)) } finally { setBusy(false) }
  }
  function submit(e: React.FormEvent) {
    e.preventDefault()
    const words = keywords.split(',').map(w => w.trim()).filter(Boolean)
    if (!name.trim() || words.length > 20 || words.some(w => w.length > 40)) { setError('Nome obrigatório. Use até 20 palavras-chave, com até 40 caracteres cada.'); return }
    if (categories.some(c => c.id !== (editing?.id || newId) && normalize(c.name) === normalize(name))) { setError('Já existe uma categoria com esse nome.'); return }
    void save({ id: editing?.id || newId, name: name.trim(), keywords: words, archived: editing?.archived || false }, editing || undefined)
  }
  return <section className="panel"><span className="eyebrow">ORGANIZE DO SEU JEITO</span><h2>Categorias</h2><p className="muted">Palavras-chave sugerem a categoria ao ler comprovantes. Arquivar mantém os lançamentos antigos.</p>
    <form onSubmit={submit}><fieldset className="form-grid" disabled={busy || disabled}>
      <label>Nome<input value={name} onChange={e => setName(e.target.value)} maxLength={60} placeholder="Ex.: Alimentação" required /></label>
      <label>Palavras-chave, separadas por vírgula<input value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="mercado, padaria, restaurante" /></label>
      <div className="actions full"><button className="primary" type="submit">{busy ? 'Salvando…' : editing ? 'Salvar categoria' : 'Criar categoria'}</button>{editing && <button type="button" onClick={() => { setEditing(null); setName(''); setKeywords('') }}>Cancelar edição</button>}</div>
    </fieldset></form>
    {error && <p className="error" role="alert">{error}</p>}
    <ul className="category-list">{categories.map(c => <li key={c.id}><div><strong>{c.name}</strong><p className="muted">{c.archived ? 'Arquivada' : c.keywords.join(', ') || 'Sem regra de sugestão'}</p></div><div className="actions"><button disabled={busy || disabled} onClick={() => { setEditing(c); setName(c.name); setKeywords(c.keywords.join(', ')) }}>Editar</button><button disabled={busy || disabled} onClick={() => void save({ ...c, archived: !c.archived }, c)}>{c.archived ? 'Reativar' : 'Arquivar'}</button></div></li>)}</ul>
    {!categories.length && <p className="empty">Crie sua primeira categoria para começar.</p>}
  </section>
}
