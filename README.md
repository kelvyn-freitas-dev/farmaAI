This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## IA, autenticação e histórico

Crie `.env.local` na raiz do projeto e configure:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-publishable-or-anon-key>
NEXT_PUBLIC_API_URL=
SUPABASE_SERVICE_ROLE_KEY=<server-only-service-role-key>

GEMINI_API_KEY=
# Alternativamente, use GOOGLE_API_KEY (tem precedência se ambas estiverem definidas).
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GROQ_API_KEY=
```

Configure pelo menos um provedor de IA. O Gemini 4 Hydrogen (`gemini-4-hydrogen`) é chamado pela Gemini API e usa `GEMINI_API_KEY` ou `GOOGLE_API_KEY`; não requer uma chave ou endpoint Hydrogen separado. A ordem de fallback é OpenAI (`gpt-6-luna`), Gemini/Hydrogen (`gemini-4-hydrogen`), Groq (`openai/gpt-oss-20b`) e Anthropic (`claude-haiku-5-5`). A chave service role do Supabase é exclusivamente de servidor; nunca a exponha com um prefixo `NEXT_PUBLIC_`.

Em instalações novas, execute primeiro a migração [20261118170000_create_study_generations.sql](./supabase/migrations/20261118170000_create_study_generations.sql) e depois [20261118190000_repair_study_generations_schema.sql](./supabase/migrations/20261118190000_repair_study_generations_schema.sql) no projeto Supabase. Se `study_generations` já existir, execute a migração de reparação: ela adiciona colunas em falta, preenche títulos antigos a partir do prompt, aplica as políticas RLS e solicita a atualização do cache da API. O app usa Supabase Auth com email e palavra-passe; configure a confirmação de email conforme a política do projeto. As rotas verificam o token de sessão e só devolvem sucesso depois de guardar a geração associada ao utilizador autenticado. O processamento de PDF/TXT aceita até 100 000 caracteres extraídos, mas envia no máximo os primeiros 12 000 caracteres ao modelo por chamada para reduzir o consumo de tokens; a interface informa quando o texto foi truncado.

`NEXT_PUBLIC_API_URL` é uma URL pública opcional para a origem das rotas Next.js, por exemplo `https://api.example.com`; deixe vazia para usar o mesmo domínio. É incorporada no bundle do frontend e nunca deve conter credenciais. Se frontend e API estiverem em origens diferentes, configure no servidor da API `APP_ALLOWED_ORIGINS` com as origens exatas do frontend, separadas por vírgulas. Em desenvolvimento, origens `localhost` e `127.0.0.1` são permitidas automaticamente.

## Aplicativo desktop para Windows

O shell Electron carrega a aplicação Next.js hospedada; não empacota nem executa as rotas de API localmente. Assim, chaves de IA e `SUPABASE_SERVICE_ROLE_KEY` permanecem apenas no servidor hospedado. Em desenvolvimento, execute `npm run dev` num terminal e `npm run desktop:dev` noutro; o shell aponta por padrão para `http://localhost:3000`.

Para gerar o instalador Windows, configure a URL pública HTTPS da aplicação e execute:

```powershell
$env:FARMASTUDY_APP_URL = "https://<dominio-da-aplicacao>"
npm run desktop:package
```

O instalador NSIS será criado em `release/`. `FARMASTUDY_APP_URL` configura o endereço carregado pelo Electron durante o empacotamento; `NEXT_PUBLIC_API_URL` configura a origem das chamadas `/api/process` e `/api/generate` no build Next.js. Se a API tiver origem diferente da aplicação carregada no Electron, inclua a origem da aplicação em `APP_ALLOWED_ORIGINS` no servidor.
