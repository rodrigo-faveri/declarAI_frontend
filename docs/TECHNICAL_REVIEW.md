# Revisão técnica do frontend

Revisão inicial realizada em 11 de outubro de 2026, considerando a estrutura do repositório, os contratos TypeScript, as rotas, o cliente HTTP e os scripts disponíveis.

## Resumo executivo

O frontend já cobre o fluxo principal do produto e integra várias áreas de domínio. O lint passa e o código transpila, mas a build falha na checagem de tipos. A base ainda tem características de protótipo evoluído: configuração local fixa, componentes de página muito extensos, ausência de testes automatizados e falta de CI. A prioridade recomendada é estabilizar a fundação antes de ampliar o escopo funcional.

## Pontos positivos

- TypeScript em modo `strict`.
- Cliente HTTP centralizado, com erro próprio e suporte a CSRF.
- Separação inicial de componentes do chat e do tema.
- Estados de carregamento e erro presentes nos fluxos principais.
- Papéis, planos, assinatura e limites refletidos na experiência.
- Interface responsiva, tema claro/escuro e feedback por notificações.
- Build otimizada e lint disponíveis como checks locais.

## Achados priorizados

### Alta prioridade

#### 1. Contrato de billing inconsistente

A build falha porque `app/admin/billing/page.tsx` acessa `provider_checkout_ready`, que não existe no tipo `BillingAdminSummary`. Pode haver outros erros de tipos encobertos por essa primeira falha.

Recomendação: alinhar o contrato com a resposta real do backend e executar a build novamente até que toda a checagem TypeScript seja aprovada.

#### 2. URL da API fixa no código

`services/api.ts` aponta diretamente para `http://localhost:8000`. Isso impede configurar staging e produção sem alteração e nova build do código.

Recomendação: usar uma variável pública validada, por exemplo `NEXT_PUBLIC_API_URL`, manter um valor local explícito em `.env.example` e documentar os ambientes.

#### 3. Ausência de testes automatizados

Não há scripts ou estrutura de testes unitários, de componentes ou ponta a ponta. Fluxos sensíveis — autenticação, limites de plano, upload, revisão fiscal, exportação e cobrança — dependem de validação manual.

Recomendação: começar pelo cliente HTTP e funções puras, adicionar testes de componentes críticos e então cobrir jornadas essenciais com E2E.

#### 4. Ausência de integração contínua

Lint e build existem, mas não há workflow versionado que os exija em pull requests.

Recomendação: criar CI com instalação reproduzível (`npm ci`), lint e build; depois incluir testes e auditoria de dependências.

### Média prioridade

#### 5. Páginas e componentes excessivamente grandes

Os principais hotspots encontrados foram:

| Arquivo | Tamanho aproximado |
| --- | ---: |
| `app/chat/page.tsx` | 3.254 linhas |
| `app/declaracao/page.tsx` | 1.822 linhas |
| `app/uploads/page.tsx` | 1.698 linhas |
| `components/chat/MessageBubble.tsx` | 1.555 linhas |
| `types/chat.ts` | 939 linhas |

Isso aumenta o custo de revisão, dificulta testes isolados e eleva o risco de conflito entre branches.

Recomendação: extrair hooks de estado/efeitos, componentes por responsabilidade, utilitários puros e contratos por domínio em PRs incrementais.

#### 6. Fronteiras de domínio pouco explícitas

O arquivo `services/api.ts` concentra autenticação, chat, documentos, declaração, billing e administração; `types/chat.ts` também contém contratos de vários domínios.

Recomendação: migrar gradualmente para módulos como `services/auth.ts`, `services/chat.ts`, `services/declarations.ts` e tipos equivalentes, mantendo uma camada compartilhada para `apiFetch` e `ApiError`.

#### 7. Controle de acesso predominantemente na interface

A home condiciona cartões por papel/plano, mas páginas cliente ainda dependem do backend para negar operações. Isso é correto apenas se todas as rotas da API fizerem autorização independente.

Recomendação: confirmar testes de autorização no backend e padronizar guards/estados de acesso negado no frontend. Nunca tratar ocultação visual como barreira de segurança.

### Baixa prioridade

#### 8. Metadados e tipografia básicos

Há metadados globais mínimos e fonte baseada no fallback do sistema. Rotas públicas poderiam ter títulos e descrições específicos.

#### 9. Resíduos do template

Os SVGs padrão do Next.js em `public/` parecem não participar da interface atual. Confirmar uso antes de removê-los em uma limpeza dedicada.

#### 10. Acessibilidade sem validação automatizada

A interface contém foco visível e elementos semânticos em vários pontos, mas não há auditoria versionada de acessibilidade.

Recomendação: incluir axe/Lighthouse e revisar teclado, nomes acessíveis, contraste e anúncios de atualizações assíncronas.

## Validação desta revisão

| Check | Resultado |
| --- | --- |
| `npm run lint` | Aprovado |
| `npm run build` | Reprovado na checagem TypeScript: `BillingAdminSummary.provider_checkout_ready` ausente |
| Testes automatizados | Não disponíveis no projeto |

## Ordem recomendada

1. Corrigir o contrato de billing e obter uma build verde.
2. Configuração por ambiente e CI.
3. Testes da camada HTTP e dos fluxos críticos.
4. Decomposição incremental dos hotspots.
5. Endurecimento de autenticação, autorização e tratamento de erros.
6. Acessibilidade, desempenho e observabilidade.

Os itens foram convertidos em sprints acionáveis em [ROADMAP.md](ROADMAP.md).
