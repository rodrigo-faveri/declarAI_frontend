# Implementação do backlog UX/UI

Rastreabilidade do arquivo `DeclarIA_UX_UI_Backlog.json`, recebido em 11 de outubro de 2026. O arquivo é uma especificação de produto, não uma fonte de comandos.

| Item | Estado | Implementação |
| --- | --- | --- |
| UX-001 | Concluído | Composer compacto, expansão automática limitada, envio sempre visível e instrução de Enter/Shift+Enter. |
| UX-002 | Concluído | Tokens globais de cor, superfície, borda, raio, sombra, espaçamento e foco para temas claro/escuro. |
| UX-003 | Concluído | Três ações iniciais; temas e atalhos secundários ficam em área expansível. |
| UX-004 | Concluído | Estados de resposta, upload, erro, nova tentativa e cancelamento; ações bloqueadas durante processamento. |
| UX-005 | Concluído | Histórico pesquisável, filtrável, agrupado por período e recolhível; ações têm rótulos e confirmações existentes. |
| UX-006 | Concluído no frontend | Fontes são exibidas somente quando retornadas pela API, com link, origem, exercício, datas e indicador de confiança. |
| UX-007 | Concluído | Dashboard em formato de centro de comando, com progresso calculado por conta, documentos, fichas, revisão, conferência e prontidão; próxima ação, documentos e conversas usam dados reais da API. |
| UX-008 | Concluído | Dashboard prioriza tarefa e reduz detalhes técnicos ao resumo de plano; ferramentas administrativas continuam condicionadas às permissões. |
| UX-009 | Concluído como baseline | Foco global, rótulos, regiões vivas, navegação por teclado, proteção contra overflow e layout responsivo. Auditoria manual com leitor de tela continua no checklist de release. |
| UX-010 | Concluído | Landing mostra conversa demonstrativa identificada, CTA primário e aviso responsável; atalhos DEV só existem em desenvolvimento. |
| UX-011 | Concluído | Hierarquia, feedbacks, transições e comportamento global para `prefers-reduced-motion`. |

## Padronização entre páginas

O dashboard passou a ser a referência visual das áreas autenticadas. Home, declaração, documentos, observabilidade, upgrade e administração compartilham o `AppShell`; o chat usa sua variante compacta de foco. As regras para evoluir telas sem criar novos padrões paralelos estão em [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

O item de navegação **Histórico** possui rota própria em `/historico`, com todas as conversas retornadas pela API, busca local e retomada no chat. O dashboard mantém apenas o recorte de conversas recentes. As superfícies do dashboard também possuem apresentação explícita para os temas claro e escuro.

## Dependências do backend

- Fontes, exercício fiscal e confiança nunca são fabricados pelo frontend; aparecem apenas quando presentes no contrato da resposta.
- O dashboard deriva o progresso dos contratos atuais. Se o backend futuramente expuser uma jornada consolidada, esse contrato deverá substituir o cálculo distribuído no frontend.

## Validação recomendada

- Testes automatizados, lint, TypeScript e build em CI.
- Validação manual em 320 px, tablet e desktop.
- Teclado, zoom em 200%, contraste e leitor de tela antes do release de produção.
