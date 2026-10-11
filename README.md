# DeclarAI — Frontend

Interface web do **DeclarAI**, um assistente para apoiar o usuário na organização e revisão da declaração de Imposto de Renda. O frontend reúne chat orientado por IA, envio e análise de documentos, montagem do rascunho da declaração, gestão de conta e recursos administrativos.

> Este repositório contém apenas o frontend. A API do DeclarAI é mantida em outro repositório e precisa estar disponível para os fluxos integrados.

## Estado do projeto

O produto já possui uma base funcional com:

- autenticação por sessão e login de desenvolvimento;
- chat com histórico de conversas, fontes e feedback;
- triagem guiada e checklist do contribuinte;
- upload, processamento e acompanhamento de documentos;
- rascunho estruturado da declaração e revisão por fichas;
- geração e download de pacotes de exportação;
- perfis de usuário, limites por plano e upgrade;
- painéis administrativos de usuários, billing e auditoria;
- temas claro e escuro e layouts responsivos.

O planejamento das próximas entregas está em [docs/ROADMAP.md](docs/ROADMAP.md), a implementação do backlog visual em [docs/UX_UI_BACKLOG.md](docs/UX_UI_BACKLOG.md), o padrão compartilhado de interface em [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md), e os achados da revisão técnica estão em [docs/TECHNICAL_REVIEW.md](docs/TECHNICAL_REVIEW.md).

A arquitetura e o checklist de publicação estão em [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Tecnologias

- Next.js 16 com App Router e Turbopack
- React 19 e TypeScript
- Tailwind CSS 4
- Radix UI e shadcn
- Lucide React
- React Markdown com GitHub Flavored Markdown
- Sonner para notificações

## Pré-requisitos

- Node.js 20 ou superior
- npm
- Docker Desktop (necessário para o Authentik local)
- backend do DeclarAI executando localmente em `http://localhost:8000`

## Como executar

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie o arquivo local de ambiente:

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. Inicie o backend do DeclarAI na porta `8000`.

4. Inicie o frontend:

   ```bash
   npm run dev
   ```

   Esse comando verifica o Docker, inicia o Docker Desktop no Windows quando
   necessário, sobe o Authentik e aguarda seu healthcheck antes de iniciar o
   Next.js. Por padrão, o Compose é lido de `C:\authentik\compose.yml`.

4. Acesse [http://localhost:3000](http://localhost:3000).

Variáveis com prefixo `NEXT_PUBLIC_` são incorporadas ao bundle pelo Next.js
durante `npm run build`. Configure a URL correta antes de gerar a imagem ou o
artefato de cada ambiente. Nunca armazene segredos em variáveis públicas.

Exemplos:

```env
# Local
NEXT_PUBLIC_API_URL=http://localhost:8000

# Staging
NEXT_PUBLIC_API_URL=https://api.staging.exemplo.com

# Produção
NEXT_PUBLIC_API_URL=https://api.exemplo.com
```

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Sobe o Authentik e inicia o frontend |
| `npm run dev:web` | Inicia somente o frontend, sem gerenciar o Authentik |
| `npm run dev:services` | Sobe e valida somente o Authentik |
| `npm run build` | Gera a build otimizada de produção e valida o TypeScript |
| `npm run start` | Executa a build de produção |
| `npm run lint` | Executa as regras de lint do projeto |
| `npm run typecheck` | Valida os tipos TypeScript sem gerar arquivos |

### Configuração do Authentik local

O launcher aceita as seguintes variáveis:

| Variável | Padrão | Uso |
| --- | --- | --- |
| `AUTHENTIK_COMPOSE_FILE` | `C:\authentik\compose.yml` no Windows | Caminho do arquivo Compose |
| `AUTHENTIK_HEALTH_URL` | `http://localhost:9000/-/health/live/` | Endpoint usado para aguardar o serviço |
| `AUTHENTIK_AUTO_START` | `true` | Use `false` para não iniciar Docker/Authentik |

Exemplo no PowerShell para usar outro Compose:

```powershell
$env:AUTHENTIK_COMPOSE_FILE='D:\infra\authentik\compose.yml'
npm run dev
```

Para executar apenas o frontend em uma sessão:

```powershell
$env:AUTHENTIK_AUTO_START='false'
npm run dev
```

O launcher não encerra os containers ao fechar o Next.js, evitando derrubar
sessões usadas por outros processos. Para pará-los explicitamente:

```powershell
docker compose -f C:\authentik\compose.yml down
```

## Rotas da aplicação

| Rota | Público principal | Responsabilidade |
| --- | --- | --- |
| `/` | Todos | Entrada, autenticação e atalhos conforme papel/plano |
| `/chat` | Usuário autenticado | Conversas, triagem, fontes e gestão da base ativa |
| `/documentos` | Premium, técnico e admin | Documentos do usuário e pendências identificadas |
| `/declaracao` | Usuário autenticado | Rascunho, revisão de fichas e exportação |
| `/upgrade` | Plano Free | Comparação de planos e início do checkout |
| `/upgrade/dev-checkout` | Desenvolvimento | Simulação local de upgrade |
| `/uploads` | Técnico e admin | Observabilidade do processamento de documentos |
| `/admin/users` | Admin | Gestão de usuários, papéis e planos |
| `/admin/billing` | Admin | Configuração e diagnóstico da cobrança |
| `/admin/audit` | Admin | Consulta de eventos sensíveis e administrativos |

As permissões também devem ser aplicadas e validadas pelo backend. Ocultar uma rota ou ação no frontend não constitui controle de acesso.

## Estrutura

```text
app/                    # Rotas e páginas do App Router
  admin/                # Painéis administrativos
  chat/                 # Experiência principal de conversa
  declaracao/           # Rascunho e revisão da declaração
  documentos/           # Documentos do usuário
  uploads/              # Observabilidade técnica de uploads
  upgrade/              # Planos e checkout
components/             # Componentes compartilhados
  chat/                 # Componentes específicos do chat
  dashboard/            # Centro de comando da declaração
  layout/               # Shell, navegação e estrutura visual compartilhada
  theme/                # Tema claro/escuro
  ui/                   # Primitivos de interface
lib/                    # Utilitários gerais
services/               # Cliente HTTP e integração com o backend
types/                  # Contratos TypeScript da API e do domínio
docs/                   # Revisão técnica e planejamento por sprints
```

## Integração com o backend

O cliente em `services/api.ts` centraliza as chamadas HTTP. As áreas de integração incluem autenticação, chat, documentos, declaração, fontes, billing e administração.

As requisições usam cookies de sessão (`credentials: "include"`) e, nos métodos de escrita, enviam o token do cookie `declaria_csrf` no cabeçalho `X-CSRF-Token`.

Para desenvolvimento local, confirme no backend:

- origem permitida: `http://localhost:3000`;
- suporte a credenciais em CORS;
- cookie de sessão compatível com o ambiente;
- endpoints e contratos alinhados aos tipos de `types/chat.ts`.

## Qualidade e validação

Antes de integrar qualquer mudança:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Os testes usam Vitest, jsdom e Testing Library. Execute `npm run test:watch` durante o desenvolvimento. O workflow de CI repete audit de dependências de produção, lint, verificação de tipos, testes e build em cada pull request e push na `main`.

## Fluxo de contribuição

O bootstrap documental deste repositório será feito diretamente na `main`. A partir dele, mudanças devem seguir branches curtas e pull requests:

1. atualize a `main`;
2. crie uma branch com prefixo `feat/`, `fix/`, `refactor/`, `docs/` ou `chore/`;
3. implemente uma alteração de escopo pequeno;
4. execute lint, verificação de tipos, testes e build;
5. abra um PR descrevendo contexto, solução, validação e evidências visuais quando houver UI;
6. faça merge somente após revisão e checks aprovados.

Consulte [CONTRIBUTING.md](CONTRIBUTING.md) para convenções e checklist de PR.

## Segurança e responsabilidade

O DeclarAI é uma ferramenta de apoio. Respostas, classificações e rascunhos devem ser revisados antes de qualquer uso fiscal. Não inclua documentos reais, credenciais, tokens ou dados pessoais em commits, issues ou logs compartilhados.

## Licença

Uso privado. Adicione uma licença explícita antes de distribuir ou abrir o código.
