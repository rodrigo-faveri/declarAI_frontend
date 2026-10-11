# Deploy do DeclarAI Frontend

Este documento define uma base independente de provedor para staging e produção. Ele não substitui os runbooks do backend nem do Authentik.

## Arquitetura-alvo

```text
Internet
   |
   +-- app.exemplo.com  -> DeclarAI Frontend (Next.js)
   +-- api.exemplo.com  -> DeclarAI Backend (FastAPI)
   `-- auth.exemplo.com -> Authentik
                              |-- PostgreSQL persistente
                              `-- Redis
```

Frontend, backend e Authentik devem ter ciclos de vida independentes. O frontend não deve iniciar Docker ou Authentik em staging/produção; essa automação é exclusiva do ambiente local.

## Contrato de ambiente

O frontend usa `NEXT_PUBLIC_API_URL` para acessar o backend. Por ser pública, essa variável é incorporada ao JavaScript durante a build e não pode conter segredos.

| Ambiente | Exemplo |
| --- | --- |
| Local | `http://localhost:8000` |
| Staging | `https://api.staging.exemplo.com` |
| Produção | `https://api.exemplo.com` |

Uma imagem criada para staging não deve ser promovida para produção quando o valor público for diferente. Nesse caso, gere uma imagem por ambiente ou implemente posteriormente uma configuração pública em runtime.

## Build em container

O `Dockerfile` usa `output: "standalone"` do Next.js e executa a aplicação como usuário sem privilégios.

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.staging.exemplo.com \
  -t declaria-frontend:staging .
```

Execução local da imagem:

```bash
docker run --rm -p 3000:3000 declaria-frontend:staging
```

Healthcheck:

```text
GET /api/health
```

Resposta esperada:

```json
{"status":"ok","service":"declaria-frontend"}
```

O healthcheck confirma que o processo web responde; a disponibilidade do backend e do Authentik deve ser monitorada separadamente.

## Configuração OIDC

No Authentik, cadastre exatamente o callback público do backend:

```text
https://api.exemplo.com/auth/callback
```

O backend deve apontar para os endpoints públicos do Authentik:

```text
AUTH_OIDC_AUTHORIZE_URL=https://auth.exemplo.com/application/o/authorize/
AUTH_OIDC_TOKEN_URL=https://auth.exemplo.com/application/o/token/
AUTH_OIDC_USERINFO_URL=https://auth.exemplo.com/application/o/userinfo/
AUTH_FRONTEND_URL=https://app.exemplo.com
```

O `client_id` pode ser identificado pelo cliente, mas `AUTH_OIDC_CLIENT_SECRET` é segredo e deve ficar apenas no cofre de secrets do backend.

## Cookies, CORS e HTTPS

- Terminar TLS apenas em componentes confiáveis e redirecionar HTTP para HTTPS.
- Habilitar cookies seguros no backend em staging e produção.
- Permitir credenciais no CORS somente para os domínios conhecidos do frontend.
- Não usar curingas de origem com cookies.
- Revisar `SameSite` e domínio dos cookies conforme os subdomínios escolhidos.
- Encaminhar corretamente `Host` e `X-Forwarded-Proto` no proxy para o callback OIDC ser construído com HTTPS.

## Secrets

Nunca inserir no bundle, imagem, repositório ou logs:

- client secret do OIDC;
- chaves do OpenRouter, Stripe, Asaas ou SerpAPI;
- segredo CSRF, assinatura de arquivos ou webhooks;
- credenciais de banco;
- tokens administrativos.

Use o gerenciador de secrets da plataforma e injete esses valores somente nos serviços que precisam deles.

## Pipeline recomendado

```text
Pull request
   -> npm ci
   -> npm audit --omit=dev --audit-level=high
   -> npm run lint
   -> npm run build
   -> testes automatizados
   -> revisão
Merge na main
   -> construir imagem imutável
   -> publicar no registry
   -> implantar em staging
   -> smoke test
   -> aprovação
   -> implantar em produção
   -> smoke test e monitoramento
```

## Checklist de release

- [ ] Lint, TypeScript, build e testes aprovados.
- [ ] `NEXT_PUBLIC_API_URL` aponta para o ambiente correto.
- [ ] Callback OIDC cadastrado exatamente no Authentik.
- [ ] CORS permite somente o frontend esperado.
- [ ] HTTPS e cookies seguros estão ativos.
- [ ] Login e checkout de desenvolvimento estão desabilitados.
- [ ] Secrets vêm do cofre da plataforma.
- [ ] Migrações e backups do backend foram confirmados.
- [ ] Healthchecks dos três serviços estão saudáveis.
- [ ] Smoke test cobre login, chat, upload e logout.
- [ ] Versão anterior da imagem está disponível para rollback.

## Rollback

As imagens devem ser imutáveis e identificadas pelo SHA do commit. Para rollback, reimplante a última imagem aprovada; não reconstrua uma tag antiga. Alterações de contrato com o backend precisam manter compatibilidade durante a janela de implantação ou ser coordenadas entre os dois repositórios.

## Decisões pendentes

- provedor de hospedagem e registry;
- domínios definitivos;
- banco e Redis gerenciados ou autogeridos;
- plataforma de secrets;
- coleta de logs, métricas e alertas;
- retenção, backup e recuperação de desastre;
- estratégia de configuração pública em runtime, caso uma única imagem precise ser promovida entre ambientes.
