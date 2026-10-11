# Contribuindo com o DeclarAI Frontend

## Fluxo de trabalho

Depois do commit inicial na `main`, toda alteração deve entrar por pull request.

```bash
git switch main
git pull --ff-only
git switch -c feat/nome-curto
```

Prefixos recomendados:

- `feat/`: nova capacidade;
- `fix/`: correção de comportamento;
- `refactor/`: reorganização sem mudança funcional intencional;
- `docs/`: documentação;
- `test/`: testes;
- `chore/`: manutenção e infraestrutura.

Evite misturar refatorações extensas com funcionalidades novas no mesmo PR.

## Commits

Use mensagens objetivas, preferencialmente no padrão Conventional Commits:

```text
feat(chat): adiciona filtro de conversas
fix(upload): trata falha de processamento
docs: documenta ambiente local
```

## Antes de abrir o PR

- [ ] O escopo está pequeno e descrito com clareza.
- [ ] `npm run lint` passou.
- [ ] `npm run typecheck` passou.
- [ ] `npm test` passou.
- [ ] `npm run build` passou.
- [ ] Fluxos alterados foram validados manualmente com o backend.
- [ ] Contratos modificados estão alinhados com o repositório do backend.
- [ ] Estados de carregamento, vazio, erro e permissão foram considerados.
- [ ] Páginas autenticadas usam o `AppShell` ou uma variante prevista em `docs/DESIGN_SYSTEM.md`.
- [ ] Não há segredos, tokens, documentos fiscais ou dados pessoais no diff.
- [ ] Mudanças visuais têm capturas de tela em desktop e mobile.
- [ ] README e roadmap foram atualizados, quando necessário.

## Modelo de descrição do PR

```markdown
## Contexto

Qual problema ou necessidade motivou a mudança?

## Solução

O que foi alterado e quais decisões foram tomadas?

## Como validar

1. Passo a passo reproduzível
2. Resultado esperado

## Evidências

Capturas de tela, vídeo ou logs relevantes.

## Riscos

Possíveis efeitos colaterais, migrações ou dependências do backend.
```

## Definição de pronto

Uma tarefa só está pronta quando o comportamento esperado foi implementado, os checks locais passaram, a documentação necessária foi atualizada e o PR foi revisado. Para fluxos fiscais ou de cobrança, inclua evidência de validação do caminho feliz e dos principais erros.
