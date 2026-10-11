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
| UX-007 | Concluído com dados disponíveis | Dashboard mostra próxima ação baseada no uso real, sem percentual inventado. A evolução para etapas documentais depende de um resumo de jornada do backend. |
| UX-008 | Concluído | Dashboard prioriza tarefa e reduz detalhes técnicos ao resumo de plano; ferramentas administrativas continuam condicionadas às permissões. |
| UX-009 | Concluído como baseline | Foco global, rótulos, regiões vivas, navegação por teclado, proteção contra overflow e layout responsivo. Auditoria manual com leitor de tela continua no checklist de release. |
| UX-010 | Concluído | Landing mostra conversa demonstrativa identificada, CTA primário e aviso responsável; atalhos DEV só existem em desenvolvimento. |
| UX-011 | Concluído | Hierarquia, feedbacks, transições e comportamento global para `prefers-reduced-motion`. |

## Dependências do backend

- Fontes, exercício fiscal e confiança nunca são fabricados pelo frontend; aparecem apenas quando presentes no contrato da resposta.
- Um progresso documental completo exige que o backend exponha etapas consolidadas da jornada. Até isso existir, o dashboard usa somente dados reais de autenticação e uso, sem estimar porcentagens.

## Validação recomendada

- Testes automatizados, lint, TypeScript e build em CI.
- Validação manual em 320 px, tablet e desktop.
- Teclado, zoom em 200%, contraste e leitor de tela antes do release de produção.
