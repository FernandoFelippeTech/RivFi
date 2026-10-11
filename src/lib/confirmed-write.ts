// Resposta perdida não prova falha nem sucesso. Só uma leitura igual confirma.
export async function confirmWrite(write: () => Promise<void>, confirmed: () => Promise<boolean>): Promise<void> {
  try { await write() }
  catch (original) {
    let matches = false
    try { matches = await confirmed() } catch { /* Preserva o erro de escrita. */ }
    if (!matches) throw original
  }
}
