# T14 — Etapa 1: Auditoria da CSP (somente diagnóstico)

Auditoria concluída sobre o código-fonte e sobre o build de produção real (`dist/`). Nenhum arquivo do projeto foi alterado.

## Script

**unsafe-eval — Necessário? NÃO**
- Nenhuma ocorrência de `eval(`, `new Function`, `setTimeout("string")` no código da aplicação (`src/`, `public/`, `index.html`, configs).
- No bundle de produção existem 3 ocorrências de `new Function`, todas do `pdfjs-dist`:
  - `isEvalSupported` — teste de recurso dentro de `try/catch`; se a CSP bloquear, o pdf.js simplesmente marca eval como indisponível e segue.
  - `PostScriptCompiler` (funções PostScript Tipo 4, usadas em sombreamentos/gradientes de PDFs específicos) — só executa se `isEvalSupported` for verdadeiro; caso contrário há fallback interpretado (`Unable to compile PS function`).
- Conclusão: remover `unsafe-eval` é seguro. Risco residual apenas de perda de performance em PDFs com funções PostScript.

**unsafe-inline — Necessário? NÃO em produção / SIM em desenvolvimento**
- `dist/index.html` contém apenas um `<script type="module" src="/assets/index-*.js">`, sem script inline e sem handlers inline.
- Em modo dev, o Vite injeta scripts inline (client HMR, React refresh) e a meta CSP do `index.html` também vale no preview. Remover `unsafe-inline` sem tratamento quebra o ambiente de desenvolvimento/preview do Lovable.
- Implicação para a Etapa 2: a remoção precisa ser condicionada ao build de produção (ex.: plugin de transformação do HTML no Vite) e não uma simples edição estática da meta tag.

## PDF

- `pdfjs-dist` (`src/hooks/usePdfExtraction.ts`): worker importado como `pdf.worker.min.mjs?url` e atribuído a `GlobalWorkerOptions.workerSrc`. No build, gera `dist/assets/pdf.worker.min-*.mjs`, mesma origem, carregado via `new Worker(url, { type: "module" })`. O wrapper em blob do pdf.js só é usado quando o worker é cross-origin — não é o caso.
- `jspdf` + `jspdf-autotable` (`src/components/relatorio/relatorioPdf.ts`): geração 100% em memória, sem worker e sem eval. Saídas usadas: `doc.output("blob")` → `URL.createObjectURL` (preview em iframe) e `doc.output("datauristring")` (anexo de e-mail).
- Dependências arrastadas pelo jspdf no bundle: `html2canvas` e `dompurify` — nenhuma exige eval.
- **unsafe-eval necessário para PDF?** NÃO.
- **worker-src necessário?** SIM — hoje o worker é permitido apenas por herança de `default-src 'self'`. Declarar `worker-src 'self' blob:` explicitamente é recomendado (o `blob:` cobre o caminho de fallback do pdf.js).

## IA / Extração

Fluxo: upload no bucket `documentos` → URL assinada → `pdfjs.getDocument(signedUrl)` → render por página em `<canvas>` → `canvas.toDataURL("image/jpeg")` → lotes de 3 imagens para a Edge Function `extract-apolice` → Lovable AI Gateway (server-side) → persistência em `conferencia_seguros_extraidos`.

- Workers: apenas o worker do pdf.js (mesma origem).
- Hosts a partir do navegador: somente `https://*.supabase.co` (REST, Storage, Functions).
- `https://ai.gateway.lovable.dev` é chamado **dentro** da Edge Function (Deno), não pelo browser → **não** precisa entrar em `connect-src`.
- `connect-src 'self' https://*.supabase.co wss://*.supabase.co` é suficiente.

## Upload / Storage

- Upload direto para o bucket privado `documentos` via `supabase.storage` (host `*.supabase.co`) — coberto por `connect-src`.
- Leitura sempre por URL assinada de 1h (`src/lib/storage.ts`).
- `img-src 'self' data: blob: https://*.supabase.co` — suficiente (imagens assinadas, dataURL do canvas, blobs locais).
- **Lacuna encontrada em `frame-src`:** o preview de anexos (`MotoristaAnexos.tsx`, `TransportadorAnexos.tsx`) usa `<iframe src={URL assinada do Supabase}>`, mas a CSP atual permite apenas `'self' blob:`. O preview de PDF em `PdfPreviewTab.tsx` usa blob (OK). Para o preview de anexos funcionar é necessário `frame-src 'self' blob: https://*.supabase.co`.
- Downloads via `window.open(signedUrl)` são navegação, não restritos por essas diretivas.

## MFA / Auth

- `@supabase/supabase-js` com e-mail/senha e TOTP (`MfaEnroll.tsx` / `MfaVerify.tsx`); o QR code vem como `data:` URL do próprio Supabase → coberto por `img-src data:`.
- Sem SDK externo, sem iframe de terceiros, sem redirecionamento para host externo.
- `previewAuthStorage.ts` usa `postMessage` para o editor Lovable — não é regido por CSP.
- Nenhuma diretiva adicional necessária.

## Excel

- `xlsx` (SheetJS) em `relatorioExcel.ts`: montagem em memória, download por blob/anchor, preview renderizado como HTML no React. Sem worker, sem script externo, sem eval.
- Nenhuma diretiva adicional necessária.

## Frame

- A aplicação não precisa ser embutida por domínios de terceiros; o único embedding é o iframe de preview do próprio Lovable, que ocorre em domínio `lovable.app` (o site publicado é servido nesse mesmo domínio).
- **`frame-ancestors 'self'` é seguro? SIM** para o app publicado.
- Observação importante: `frame-ancestors` é **ignorado** quando declarado por `<meta http-equiv>` — só funciona como header HTTP. Aplicá-lo na meta tag não traria proteção real e não quebraria nada; a proteção efetiva depende de header no hosting.

## Estilos

- Tailwind/shadcn geram um CSS estático (`dist/assets/index-*.css`).
- Porém Radix UI, `vaul`, `embla`, `recharts` e o `next-themes` aplicam **atributos `style` inline** em runtime, e `src/index.css` importa `https://fonts.googleapis.com/css2?family=Inter...`.
- **unsafe-inline em style-src: Necessário? SIM.** Manter, junto de `https://fonts.googleapis.com` e `font-src https://fonts.gstatic.com`.

## CSP recomendada (PROPOSTA — não aplicada)

Produção:

```text
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: blob: https://*.supabase.co;
connect-src 'self' https://*.supabase.co wss://*.supabase.co;
worker-src 'self' blob:;
frame-src 'self' blob: https://*.supabase.co;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'self';
```

Diferenças em relação à atual: remoção de `unsafe-eval` e `unsafe-inline` de `script-src`; inclusão de `worker-src`; `frame-src` passa a permitir o host do Supabase (corrige lacuna atual); inclusão de `frame-ancestors` (efetivo apenas como header HTTP).

Em desenvolvimento é obrigatório manter `script-src 'self' 'unsafe-inline'` (e a variante do Vite), portanto a Etapa 2 deve gerar a CSP condicionada ao modo de build.

## Riscos

| Mudança | Risco | Observação |
|---|---|---|
| Remover `unsafe-eval` | **Baixo** | pdf.js degrada com fallback; validar extração de apólice |
| Adicionar `worker-src 'self' blob:` | **Baixo** | Apenas explicita o que já é permitido |
| Ampliar `frame-src` com Supabase | **Baixo** | Corrige preview de anexos hoje bloqueado |
| `frame-ancestors 'self'` | **Baixo** | Sem efeito via meta; requer header no hosting |
| Remover `unsafe-inline` de `script-src` | **Médio** | Quebra dev/preview se aplicado estaticamente; exige CSP por ambiente |

## Arquivos alterados

Nenhum.

## Código alterado

Nenhum.

## Banco

Nenhuma alteração (schema, RLS, policies, dados e Edge Functions intactos).

## Próximo passo (aguardando aprovação)

Etapa 2 — aplicar a CSP proposta com separação por ambiente e validar PDF, Excel, uploads, extração por IA, MFA e Supabase.
