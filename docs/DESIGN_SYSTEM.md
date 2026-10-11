# Sistema visual do DeclarIA

Este documento define o padrão obrigatório para páginas autenticadas. A referência é o dashboard em formato de centro de comando: fundo azul-marinho, superfícies compactas, bordas discretas e verde-esmeralda reservado para ação e progresso.

## Estrutura compartilhada

Toda nova página autenticada deve usar `components/layout/AppShell.tsx`. O componente centraliza:

- marca e navegação principal;
- indicação da seção ativa;
- atalhos condicionados ao papel do usuário;
- resumo de conta e plano;
- alternância de tema nas telas compatíveis;
- navegação horizontal em telas menores;
- largura, espaçamento e fundo da área de conteúdo.

Exemplo:

```tsx
<AppShell
  activeSection="documents"
  user={authUser}
  taxYear={2026}
  maxWidth="max-w-[1500px]"
>
  <DocumentPageContent />
</AppShell>
```

O chat usa `FocusModeNavigation`, uma variante compacta do mesmo sistema. Ela preserva o espaço da conversa sem isolar o usuário do restante do produto. Landing pública, login e páginas de erro podem usar uma composição própria, mas devem reutilizar os mesmos tokens.

## Tokens e linguagem visual

Os tokens globais vivem em `app/globals.css`. Não introduza uma nova cor de fundo, raio ou sombra para uma página inteira sem atualizar este documento.

| Papel | Padrão escuro | Uso |
| --- | --- | --- |
| Fundo | `#07101f` | canvas da aplicação |
| Navegação | `#081322` | barra lateral |
| Cabeçalho | `#091526` | barra superior |
| Painel | `#0d1a2d` | cards e grupos |
| Ação principal | emerald | CTA, progresso e estado positivo |
| Informação | sky | links e informação contextual |
| Atenção | amber | revisão e pendência |
| Erro | rose | falha e ação destrutiva |

Use cantos `rounded-xl` em controles e `rounded-2xl` nos painéis. A borda padrão escura é `border-white/8` ou `border-white/10`. Evite gradientes decorativos fora de áreas de destaque.

## Hierarquia de página

Cada tela deve conter, nesta ordem:

1. título e descrição objetiva;
2. ação principal visível;
3. estado ou próximo passo, quando aplicável;
4. conteúdo operacional em cards;
5. estados de carregamento, vazio, erro e acesso negado.

Dados fiscais e permissões continuam vindo da API. O layout nunca deve sugerir que uma etapa foi concluída sem evidência do backend.

## Responsividade e acessibilidade

- Não crie uma segunda barra lateral fora do shell. Exceção: histórico contextual do chat.
- Garanta uso a partir de 320 px sem rolagem horizontal da página.
- Use `aria-current="page"` na navegação ativa e rótulos em botões somente com ícone.
- Preserve foco visível, zoom de 200% e `prefers-reduced-motion`.
- Valide teclado, contraste e leitor de tela antes de um release.

## Checklist para páginas novas

- [ ] Usa `AppShell` ou a variante de foco documentada.
- [ ] Declara corretamente `activeSection`.
- [ ] Não duplica marca, perfil ou navegação global.
- [ ] Reutiliza os tokens de `app/globals.css`.
- [ ] Trata desktop, mobile, loading, vazio, erro e permissão.
- [ ] Inclui teste da navegação ou do comportamento novo.
- [ ] Possui evidência visual no pull request.
