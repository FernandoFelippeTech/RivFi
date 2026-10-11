import { normalize, parseMoney, validDate } from './finance.ts'
import type { Category } from './finance.ts'
export type ReceiptReading = { amounts: number[]; dates: string[]; description: string; text: string }
export function parseReceipt(text: string): ReceiptReading {
  const amounts: number[] = []
  for (const match of text.matchAll(/(?<![\d.,])(?:R\$\s*)?(\d{1,3}(?:\.\d{3})+,\d{2}|\d+,\d{2})(?!\d)/g)) {
    try { amounts.push(parseMoney(match[1])) } catch { /* Ruído de OCR não vira valor. */ }
  }
  const dates: string[] = []
  for (const m of text.matchAll(/\b(\d{2})[/-](\d{2})[/-](\d{4})\b/g)) {
    const date = `${m[3]}-${m[2]}-${m[1]}`
    if (validDate(date)) dates.push(date)
  }
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  let description = ''
  for (let i = 0; i < lines.length; i++) {
    const label = /^(?:estabelecimento|destinat[aá]rio|favorecido|recebedor|benefici[aá]rio)\s*:?\s*(.*)$/i.exec(lines[i])
    if (label) {
      const candidate = label[1] || lines[i + 1] || ''
      if (candidate.length <= 200 && /[a-zà-ú]{3}/i.test(candidate) && !/^(cpf|cnpj|data|valor|banco|ag[eê]ncia|conta)\b/i.test(candidate)) description = candidate
      break
    }
  }
  return { amounts: [...new Set(amounts)], dates: [...new Set(dates)], description, text }
}
export function suggestCategory(text: string, categories: Category[]): string {
  const words = normalize(text).split(/[^a-z0-9]+/).join(' ')
  const matches = categories.filter(c => !c.archived && c.keywords.some(k => k.trim() && ` ${words} `.includes(` ${normalize(k)} `)))
  return matches.length === 1 ? matches[0].id : ''
}
