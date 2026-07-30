# Segurança e operação

## Modelo implementado

- A autenticação usa um token opaco aleatório no cookie `garq_session`. O cookie é `httpOnly`, `SameSite=Lax`, `Secure` em produção e possui expiração configurável.
- Somente o SHA-256 do token é persistido em `sessions`. Logout, redefinição de senha, remoção de usuário e alteração cadastral/papel revogam sessões no banco.
- Requisições mutáveis autenticadas exigem o token CSRF vinculado à sessão no header `X-CSRF-Token`. O frontend lê apenas o cookie CSRF; nunca lê a credencial de sessão.
- A política de documentos valida o vínculo `User -> Cliente -> Imovel` no banco. IDs recebidos na URL não são considerados evidência de autorização.
- O vínculo de uma conta a um cliente não é mais inferido por igualdade de e-mail. Um administrador deve confirmá-lo explicitamente por `PATCH /api/clientes/:id/usuario`.
- Operações de criação, edição, exclusão, destaque e visibilidade de imóveis são exclusivas de administradores. A leitura pública por ID exige `isVisible: true`.
- Documentos novos são enviados ao Cloudinary com delivery type `authenticated`. A API não retorna a URL persistente e gera uma URL assinada de cinco minutos somente após autorização por objeto.

## Uploads

- Limite HTTP de 14 MB para a rota de documentos e 15 MB para imóveis.
- Limite real de 10 MB após decodificação por documento e 3 MB por imagem.
- Um documento por requisição e no máximo 15 itens de galeria.
- MIME, extensão e magic bytes devem ser coerentes. SVG, formatos desconhecidos, texto com NUL e PDFs com ações JavaScript/OpenAction/Launch/arquivo embutido são rejeitados.
- Os controles não substituem antivírus. Para documentos de terceiros, integrar um scanner antimalware assíncrono e quarentena antes de liberar o download.

## Logs e retenção

O logger emite JSON com `timestamp`, `level`, `action`, `requestId`, status e IDs internos. Campos cujo nome indique senha, token, cookie, autorização, e-mail, telefone, documento, corpo ou payload são descartados antes da escrita. Não registrar objetos de request/response nem erros completos.

Configurar na plataforma de logs:

- retenção operacional padrão: 30 dias;
- eventos de autenticação/autorização: até 90 dias, conforme base legal e política interna;
- acesso restrito por função e trilha de auditoria;
- exclusão automática ao fim da retenção e proibição de exportar payloads/PII.

## Migração de documentos (não executada)

1. Fazer backup e inventário somente por IDs internos, contando registros com `accessMode` ausente ou `legacy_public`; não exportar URLs em logs.
2. Em homologação, copiar/re-enviar cada ativo com `type: authenticated`, preservando nome, MIME, tamanho e vínculo.
3. Atualizar atomicamente `public_id`, `resourceType`, `deliveryType`, `accessMode` e `format`; manter o ativo antigo durante uma janela curta de rollback.
4. Testar acesso como administrador, cliente vinculado e cliente não vinculado pelo endpoint `/download`.
5. Após aprovação separada, invalidar e remover o ativo público antigo no Cloudinary. Só então eliminar o fallback `legacy_public` do controller.
6. Conferir contagens e amostras, documentar falhas e repetir de modo idempotente. Nunca executar em produção sem backup, janela e autorização explícita.

Enquanto essa migração não ocorrer, registros antigos continuam materialmente públicos para quem já conhece a URL original. A aplicação deixou de expor essas URLs, mas não pode revogá-las sem alterar o ativo no Cloudinary.

## Migração de sessões

- Não é necessário converter JWTs existentes: eles deixam de ser aceitos e os usuários fazem login novamente.
- A collection `sessions` e o índice TTL são criados pelo Mongoose. Antes da liberação, validar a criação dos índices e alertas de crescimento.
- Publicar backend e frontend na mesma janela para evitar que um frontend antigo espere o campo `token`.
- Após a liberação, confirmar cookies `Secure`/`httpOnly`, logout, expiração, revogação e CSRF no domínio real.

## Dependências

| Pacote | Antes | Depois | Decisão |
|---|---:|---:|---|
| mongoose | 9.3.3 | 8.24.2 | Linha corrigida compatível com Node 18/20; a anterior exigia Node 20.19+ e contrariava o README. |
| multer | 2.1.1 | removido | Não era usado; manter o parser aumentava a superfície. |
| jsonwebtoken | 9.0.3 | removido | Substituído por sessões opacas revogáveis. |
| express-rate-limit | 8.3.2 | 8.6.1 | Corrige a dependência transitiva `ip-address`. |
| joi | 18.1.2 | 18.2.3 | Corrige `GHSA-q7cg-457f-vx79`. |
| body-parser (override) | 2.2.2 | 2.3.0 | Corrige `GHSA-v422-hmwv-36x6`. |
| qs (override) | 6.15.0 | 6.15.3 | Corrige `GHSA-q8mj-m7cp-5q26`. |
| brace-expansion (override) | 5.0.5 | 5.0.9 | Corrige os advisories de DoS associados. |
| postcss (frontend) | 8.5.8 | 8.5.25 | Corrige `GHSA-qx2v-qp2m-jg93`, `GHSA-6g55-p6wh-862q` e `GHSA-r28c-9q8g-f849`. |
| Next.js | ausente | ausente | O projeto usa HTML estático; não há Next.js a atualizar. |

O lockfile é obrigatório e o CI usa `npm ci`.

## Ações manuais de produção

1. Definir `SESSION_TTL_HOURS`, `CORS_ORIGINS` e `FRONTEND_URL` com origens exatas; não reutilizar valores de exemplo.
2. Confirmar HTTPS e cookies `Secure` no proxy Vercel/Render.
3. Criar e verificar índices de `sessions`, alertas de taxa, tamanho de body e erros 401/403/413.
4. Executar a migração de documentos acima somente após autorização separada.
5. Configurar retenção e acesso aos logs; revisar se o provedor acrescenta headers/corpos automaticamente.
6. Executar smoke tests com contas fictícias de administrador e dois clientes.
