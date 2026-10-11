# RivFi

Controle financeiro pessoal em português do Brasil. React, TypeScript e Vite no frontend; Supabase para autenticação e sincronização. OCR gratuito executado no dispositivo, sem integração bancária ou API de IA.

## Executar no Windows

Use Node.js 24 LTS (mínimo 22.18). No PowerShell:

```powershell
Set-Location -LiteralPath 'C:\Users\User\Desktop\Fernando\Site -Fernando\RivFi'
npm.cmd ci
if (-not (Test-Path -LiteralPath '.env.local')) { Copy-Item -LiteralPath '.env.example' -Destination '.env.local' }
notepad.exe .env.local
npm.cmd run dev
```

Preencha `.env.local` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. Use somente a chave pública `sb_publishable_...` ou a chave legada `anon`. O Vite rejeita chaves privilegiadas antes de iniciar ou gerar o site. Arquivos de ambiente ficam fora do Git.

Sem configuração, a aplicação exibe instruções. Acesse `http://localhost:5173`. Abra a pasta `RivFi` no VS Code: ela tem repositório Git próprio.

## Configurar o Supabase

1. Confirme no painel que o projeto está ativo e que Auth, Database e API respondem. A tela “Coming up…” ainda não indica disponibilidade.
2. Execute `supabase/inspect.sql`, que é somente leitura, para conferir tabelas, colunas, políticas e triggers existentes.
3. Revise `supabase/migrations/202610080001_personal_finance.sql` antes de aplicar. Em um banco existente, obtenha autorização antes de executar a migração.
4. A migração cria `rivfi_categories`, `rivfi_transactions` e as funções `rivfi_snapshot`, `rivfi_restore` e `rivfi_current_month`. Não altera nem exclui tabelas antigas. Se os nomes já existirem, a execução falha; investigue a compatibilidade antes de continuar.
5. Use uma conta existente no Supabase Auth. Para uso pessoal, desative inscrições públicas depois de confirmar sua conta. O aplicativo não oferece cadastro público.
6. Configure Site URL e Redirect URLs para `http://localhost:5173` e, ao publicar, para a URL HTTPS do site. A recuperação de senha depende também da configuração de e-mail do Supabase.
7. Valide autenticação, gravação e sincronização nos dois dispositivos. Com dois usuários de teste, verifique que um não acessa os registros do outro.

O acesso remoto e a disponibilidade do projeto precisam de validação no ambiente real. Os testes SQL locais usam Auth e usuários simulados. Dados de tabelas antigas não são importados automaticamente: é necessário avaliar o esquema e o tratamento de registros históricos.

## Regras financeiras

- Valores positivos em centavos inteiros; saldo mensal = receitas − despesas. Não é saldo bancário consultado.
- Fuso `America/Sao_Paulo`. Somente o mês atual permite criar, editar ou excluir lançamentos; o banco também impõe essa regra.
- Meses passados são somente para consulta. Comprovantes antigos não podem gerar novos lançamentos; restaurações ignoram registros fora do mês atual, com aviso e contagem antes de confirmar.
- Categorias podem ser renomeadas e arquivadas. O histórico preserva suas referências. Palavras-chave separadas por vírgula sugerem categorias no OCR.
- Pix não determina o tipo da movimentação. Transferências entre contas próprias não devem ser registradas como receita ou despesa.
- Mesmo dia, valor e tipo geram um aviso de possível duplicidade, com opção de confirmar movimentações legítimas iguais.
- Atualização ao abrir/retornar à janela, a cada minuto e pelo botão Atualizar. Não há edição offline.
- O sucesso só é anunciado após confirmação. Em caso de resposta perdida, uma nova leitura pode confirmar a gravação pelo mesmo ID e conteúdo. Edições verificam o estado anterior para evitar sobrescrever alterações de outro dispositivo.

## Backup

JSON versionado com categorias e lançamentos obtidos em uma única consulta consistente, sem truncamento de mil linhas. Não inclui imagens, usuário ou credenciais. Guarde esses arquivos financeiros em local protegido.

A restauração valida versão, IDs, datas, centavos, referências e registros repetidos. IDs iguais com conteúdo igual são ignorados; conteúdo divergente bloqueia a operação. Categorias com mesmo nome são reaproveitadas. Registros semelhantes com IDs distintos exigem escolha entre ignorar ou importar. A gravação é transacional: qualquer erro desfaz o lote inteiro.

Limites: 500 categorias, 50.000 lançamentos e arquivo de restauração de até 25 MB. A regra do mês atual também vale para restauração; a aplicação não oferece exceção para importar meses passados.

## Leitura de comprovantes

Tesseract.js roda em um Web Worker. Os comandos de desenvolvimento e build preparam biblioteca, WebAssembly e modelo português em `public/ocr`, a partir dos pacotes npm. Esses arquivos são gerados e não são versionados; o próprio site os fornece ao navegador.

Aceita JPG, PNG e WebP de até 12 MB. Converta HEIC para JPG ou selecione um print. A imagem é redimensionada para até 2.200 pixels no maior lado e permanece no dispositivo. O Supabase recebe apenas os campos confirmados; a imagem e o texto bruto não são armazenados.

Use navegador atualizado e imagem nítida. A primeira leitura pode demorar para carregar o modelo. Há progresso, cancelamento, limite de dois minutos e alternativa manual. A precisão varia com a imagem e o dispositivo.

Campos ausentes ficam vazios. Vários valores ou datas exigem escolha. A descrição é sugerida a partir de rótulos explícitos, como destinatário. O tipo da movimentação é sempre escolhido pelo usuário. Tudo deve ser revisado antes de salvar.

## Verificar o projeto

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd exec playwright install chromium
npm.cmd run test:ui
```

Os testes unitários usam o executor do Node. A migração SQL é testada em PostgreSQL via PGlite. Os testes de interface usam Chromium, dados fictícios e imagem sintética, sem acessar o Supabase real. Incluem tamanhos de notebook/celular, falha de gravação, duplicidades, backup e OCR sem transmissão externa.

Para inspecionar exemplos no servidor de desenvolvimento: `http://localhost:5173/tests/preview.html`. Essa página não entra no build de produção.

## Hospedagem gratuita

Caminho preparado: **Cloudflare Pages Free + Supabase Free**. Depois de autorizar a publicação, configure Node 24, comando `npm run build`, saída `dist` e as duas variáveis públicas do Supabase. Também é possível gerar `dist` localmente e fazer upload manual.

Configure a URL `https://...pages.dev` no Supabase e acesse-a no notebook e no celular com a mesma conta. O notebook pode ficar desligado. É possível adicionar um atalho à tela inicial do celular; não há suporte offline.

```powershell
npm.cmd run build
npm.cmd run preview
```

Para hospedagem em subpasta, como GitHub Pages:

```powershell
$env:RIVFI_BASE_PATH = '/RivFi/'
npm.cmd run build
Remove-Item Env:RIVFI_BASE_PATH
```

Confirme os limites dos planos antes de publicar. Cloudflare Pages Free permite 500 builds/mês e arquivos individuais até 25 MiB; os recursos OCR estão abaixo desse limite individual. Supabase Free inclui 500 MB de banco e pode pausar projetos com baixa atividade em sete dias, exigindo reativação manual.

Fontes: [Cloudflare Pages](https://developers.cloudflare.com/pages/), [limites Pages](https://developers.cloudflare.com/pages/platform/limits/), [Supabase Free](https://supabase.com/pricing), [pausa de projetos](https://supabase.com/docs/guides/platform/free-project-pausing), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Tesseract.js](https://github.com/naptha/tesseract.js).
