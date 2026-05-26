# GARQ Imóveis — Plataforma de Gestão de Ativos Imobiliários

> Plataforma full stack privada para gestão e exibição de imóveis de alto padrão. Backend RESTful em Node.js/Express com MongoDB Atlas, frontend estático implantado na Vercel.

---

## Arquitetura do Projeto

```
projeto-garq/
├── backend/
│   ├── src/
│   │   ├── app.js
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   └── routes/
│   ├── scripts/
│   ├── .env                  # Variáveis de ambiente (NÃO commitar)
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── index.html
    ├── login.html
    ├── admin.html
    ├── clientes.html
    ├── configuracoes.html
    ├── recuperar-senha.html
    ├── redefinir-senha.html
    ├── src/
    └── vercel.json
```

---

## Tecnologias

| Camada | Tecnologia | Finalidade |
|---|---|---|
| Runtime | Node.js | Servidor backend |
| Framework | Express | Roteamento e middleware |
| Banco de Dados | MongoDB Atlas | Persistência de dados |
| ODM | Mongoose | Modelagem de dados |
| Autenticação | jsonwebtoken | Tokens JWT stateless |
| Hash de Senha | bcryptjs | Criptografia de senhas |
| E-mail | Resend | Envio via HTTP |
| Upload | Cloudinary | Imagens e documentos |
| Validação | Joi | Validação de schema |
| Segurança | Helmet + express-rate-limit | Headers + brute force |
| Frontend | HTML + Tailwind CSS | Interface do usuário |
| Deploy Frontend | Vercel | Hospedagem |
| Deploy Backend | Serviço de nuvem | API em produção |

---

## Instalação

### Pré-requisitos

- Node.js >= 18.x
- Conta no MongoDB Atlas
- Conta no Cloudinary
- Conta no Resend (domínio verificado)

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd garq-imoveis
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# edite o .env com suas credenciais
npm run dev
```

### 3. Frontend

Abra `index.html` com o Live Server (VS Code) na porta `5500`.

O `config.js` detecta o ambiente automaticamente — localhost aponta para a API local, produção usa o proxy configurado no `vercel.json`.

---

## Funcionalidades

- Portfólio público de imóveis com filtros por tipo e status
- Painel administrativo com inventário completo
- Gestão de clientes com vínculos a imóveis (interessado/proprietário)
- Upload e visualização de documentos por imóvel
- Controle de visibilidade (publicar/ocultar imóveis)
- Configurações dinâmicas — tipos, status, finalidades e rótulos editáveis pelo painel
- Gestão de usuários com controle de roles (admin/user)
- Recuperação de senha por e-mail

---

## Modelo de Segurança

- Senhas com hash bcryptjs antes da persistência
- Tokens JWT stateless com expiração configurável
- Middleware de autenticação em duas camadas (leve e estrito)
- RBAC — controle de acesso por role em operações sensíveis
- Rate limiting em rotas de autenticação
- Body limits diferenciados por grupo de rotas
- Headers de segurança HTTP via Helmet
- CORS com allowlist explícita de origens
- Registro de novos usuários restrito a admins autenticados
- Rota pública de imóveis sempre filtra conteúdo oculto

---

## Licença

Proprietário — GARQ Imóveis © 2026. Todos os direitos reservados.