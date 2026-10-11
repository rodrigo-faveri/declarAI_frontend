# Roadmap por sprints

Planejamento inicial do frontend do DeclarAI. A sugestão é trabalhar em sprints de duas semanas, reajustando capacidade e prioridade após cada revisão. Cada item deve virar issue com responsável, critérios de aceite e dependências explícitas do backend.

## Visão geral

| Sprint | Objetivo | Resultado esperado |
| --- | --- | --- |
| 0 | Baseline do repositório | Documentação, processo e estado inicial reproduzível |
| 1 | Fundação e ambientes | Configuração segura, CI e contratos de integração claros |
| 2 | Qualidade essencial | Testes automatizados nos fluxos de maior risco |
| 3 | Arquitetura do chat | Chat modular, testável e mais simples de evoluir |
| 4 | Documentos e declaração | Jornadas fiscais coesas e componentes menores |
| 5 | Autenticação e segurança | Permissões previsíveis e sessões bem tratadas |
| 6 | Billing e operação | Jornada comercial confiável e observável |
| 7 | UX, acessibilidade e entrega | Experiência polida e pronta para produção |

## Sprint 0 — Baseline e processo

Objetivo: criar um ponto de partida compartilhado.

- [x] Documentar visão do produto, stack, rotas e execução local.
- [x] Registrar a revisão técnica e os riscos iniciais.
- [x] Criar roadmap priorizado por sprints.
- [x] Definir fluxo de branches, commits e pull requests.
- [ ] Confirmar no repositório remoto a proteção da `main` após o commit inicial.
- [ ] Criar labels e milestones correspondentes às sprints.

Critério de aceite: uma pessoa nova consegue entender o projeto, executá-lo e saber como contribuir.

## Sprint 1 — Fundação, ambientes e CI

Objetivo: tornar o projeto configurável e verificável em todos os ambientes.

- [x] Externalizar a URL da API para `NEXT_PUBLIC_API_URL`.
- [ ] Alinhar `BillingAdminSummary` com o uso no painel e restaurar a build TypeScript.
- [x] Adicionar `.env.example` sem segredos.
- [ ] Validar configuração ausente ou inválida com mensagem clara.
- [ ] Mapear URLs, cookies, CORS e callbacks por ambiente junto ao backend.
- [ ] Criar workflow de CI com `npm ci`, lint e build.
- [ ] Adicionar template de pull request e responsáveis por revisão.
- [x] Documentar a arquitetura-base, o container e o contrato de configuração para deploy.
- [ ] Escolher a plataforma e configurar preview/staging com variáveis reais.

Critério de aceite: o mesmo código gera builds para local, preview e produção; PRs não podem ser integrados com lint ou build quebrados.

## Sprint 2 — Testes e contratos críticos

Objetivo: proteger integrações e regras que têm maior impacto no usuário.

- [ ] Configurar framework de testes unitários e de componentes.
- [ ] Testar `apiFetch`, CSRF, erros HTTP, falha de rede e `Retry-After`.
- [ ] Criar fixtures tipadas para autenticação, chat, upload e declaração.
- [ ] Testar permissões e limites por papel/plano na navegação.
- [ ] Configurar testes E2E para login, chat básico e upload.
- [ ] Definir estratégia de mock/ambiente de teste do backend.
- [ ] Publicar relatório de cobertura como sinal, sem meta artificial inicial.

Critério de aceite: falhas nos contratos principais são detectadas automaticamente antes do merge.

## Sprint 3 — Modularização do chat

Objetivo: reduzir o maior hotspot sem alterar a experiência existente.

- [ ] Separar hooks de autenticação, conversas, envio e triagem.
- [ ] Extrair utilitários puros e modelos de apresentação.
- [ ] Dividir `app/chat/page.tsx` por seções funcionais.
- [ ] Dividir `components/chat/MessageBubble.tsx` por tipos de conteúdo.
- [ ] Separar contratos e serviço do domínio de chat.
- [ ] Cobrir retomada, renomeação, exclusão e reset de conversa.
- [ ] Validar estados de carregamento, espera, retry e rate limit.

Critério de aceite: os componentes principais têm responsabilidade clara, testes focados e comportamento equivalente ao baseline.

## Sprint 4 — Documentos e declaração

Objetivo: consolidar a jornada do documento até a revisão final.

- [ ] Modularizar as páginas de uploads, documentos e declaração.
- [ ] Padronizar status de processamento, erro e reprocessamento.
- [ ] Melhorar feedback de progresso e arquivos rejeitados.
- [ ] Testar revisão de itens, fichas e revisão final.
- [ ] Testar preview e downloads de exportação.
- [ ] Exibir claramente ano-calendário/exercício em todas as etapas.
- [ ] Revisar mensagens de responsabilidade e confirmação antes da exportação.

Critério de aceite: o usuário entende onde cada documento está, o que foi extraído, o que falta revisar e o que será exportado.

## Sprint 5 — Autenticação, autorização e segurança

Objetivo: tornar identidade e acesso consistentes em todas as rotas.

- [ ] Criar tratamento compartilhado para sessão expirada e acesso negado.
- [ ] Definir guards de rota e estados de autorização por papel/plano.
- [ ] Confirmar autorização server-side de todos os endpoints com o backend.
- [ ] Restringir login e checkout de desenvolvimento ao ambiente local.
- [ ] Revisar cookies, CSRF, redirects e URLs externas.
- [ ] Evitar exposição de dados pessoais em logs e mensagens de erro.
- [ ] Documentar modelo de ameaças mínimo dos fluxos fiscais.

Critério de aceite: usuário anônimo, Free, Premium, técnico e admin têm acessos previsíveis, testados e negados também no backend.

## Sprint 6 — Billing e operação

Objetivo: preparar assinatura e administração para operação confiável.

- [ ] Validar checkout, retorno, cancelamento e portal do cliente.
- [ ] Tratar atualização assíncrona de assinatura após webhook.
- [ ] Cobrir estados `active`, `trialing`, `past_due` e `canceled`.
- [ ] Adicionar testes do painel de billing e troca de provider.
- [ ] Melhorar filtros, paginação e detalhes da auditoria.
- [ ] Instrumentar erros e eventos críticos sem dados sensíveis.
- [ ] Criar runbook para falhas de pagamento e divergências de plano.

Critério de aceite: o estado exibido converge com o provider e o time consegue diagnosticar falhas sem consultar dados diretamente no banco.

## Sprint 7 — UX, acessibilidade e produção

Objetivo: concluir o endurecimento da experiência e da entrega.

- [ ] Auditar navegação por teclado, foco, contraste e leitores de tela.
- [ ] Executar auditoria de desempenho e reduzir bundles/efeitos desnecessários.
- [ ] Adicionar metadados específicos por rota e identidade visual final.
- [ ] Padronizar skeletons, estados vazios, erros e confirmações.
- [ ] Validar layouts em celulares, tablets e desktop.
- [ ] Remover assets e componentes comprovadamente não utilizados.
- [ ] Criar checklist de release, rollback e smoke test de produção.

Critério de aceite: os fluxos críticos atendem ao padrão acordado de acessibilidade, desempenho e operação, com release reproduzível.

## Backlog futuro

- Internacionalização e revisão completa dos textos.
- Design system documentado e catálogo de componentes.
- Telemetria de produto com consentimento e minimização de dados.
- Testes visuais de regressão.
- Estratégia offline ou recuperação de rascunho, se houver necessidade validada.

## Ritual sugerido

- Planejamento: selecionar somente itens que caibam na capacidade real.
- Daily curta: impedimentos e dependências entre frontend/backend.
- Refinamento: preparar a sprint seguinte com contratos e critérios de aceite.
- Review: demonstrar software funcionando com evidências.
- Retrospectiva: registrar uma ou duas melhorias concretas de processo.

Cada sprint deve terminar com `main` implantável. Trabalho incompleto permanece na branch ou atrás de uma flag segura; não deve ser integrado apenas para cumprir calendário.
