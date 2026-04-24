# 🏠 GARQ Invest — Plataforma de Imóveis de Alto Padrão

> Plataforma full stack para gestão e exibição de imóveis de alto padrão. Backend RESTful em Node.js/Express com MongoDB Atlas e frontend estático com Tailwind CSS implantado na Vercel.

---

## 📐 Arquitetura do Projeto

```
projeto-garq/
├── backend/                        # API RESTful (Node.js + Express)
│   ├── src/
│   │   ├── app.js                  # Entry point — CORS, Helmet, rotas
│   │   ├── config/
│   │   │   └── db.js               # Conexão MongoDB Atlas
│   │   ├── controllers/
│   │   │   ├── authController.js   # Registro, login, recuperação de senha
│   │   │   └── imovelController.js # CRUD de imóveis
│   │   ├── middleware/
│   │   │   └── auth.js             # Middleware JWT (protect)
│   │   ├── models/
│   │   │   ├── User.js             # Schema de usuário + hash de senha
│   │   │   └── Imovel.js           # Schema de imóvel (galeria, atributos)
│   │   └── routes/
│   │       ├── auth.js             # /api/auth/*
│   │       └── imoveis.js          # /api/imoveis/*
│   ├── .env                        # Variáveis de ambiente (NÃO commitar)
│   ├── package.json
│   └── vercel.json
│
└── frontend/                       # SPA estático (HTML + Tailwind CSS)
    ├── index.html                  # Página principal / listagem
    ├── login.html                  # Login de admin
    ├── cadastro.html               # Cadastro de usuário
    ├── admin.html                  # Painel administrativo
    ├── recuperar-senha.html        # Solicitação de recuperação de senha
    ├── redefinir-senha.html        # Redefinição de senha via token
    ├── src/
    │   ├── config.js               # API_URL (local vs produção)
    │   ├── auth-handler.js         # Gerenciamento de sessão JWT
    │   ├── login-handler.js        # Lógica de login
    │   ├── recovery.js             # Fluxo "esqueci a senha"
    │   ├── reset-password.js       # Fluxo de redefinição de senha
    │   ├── admin.js                # CRUD via painel admin
    │   ├── home-api.js             # Listagem pública de imóveis
    │   └── modules/
    │       └── authService.js      # Serviço de autenticação reutilizável
    └── vercel.json
```

### Diagrama de Fluxo — Autenticação

```
[Frontend]                     [Backend API]               [MongoDB]
    │                               │                          │
    │── POST /api/auth/login ───────▶│                          │
    │                               │── User.findOne() ────────▶│
    │                               │◀── user doc ─────────────│
    │                               │── bcrypt.compare()        │
    │◀── { token, user } ───────────│                          │
    │                               │                          │
    │── GET /api/imoveis ───────────▶│                          │
    │◀── { data: [...] } ───────────│                          │
    │                               │                          │
    │── POST /api/imoveis ──────────▶│                          │
    │   Authorization: Bearer <JWT> │── JWT.verify() ──────────│
    │                               │── Imovel.create() ───────▶│
    │◀── { success: true } ─────────│                          │
```

---

## 🛠️ Tecnologias Utilizadas

| Camada | Tecnologia | Versão | Finalidade |
|---|---|---|---|
| **Runtime** | Node.js | 18+ | Servidor backend |
| **Framework** | Express | 5.x | Roteamento e middleware |
| **Banco de Dados** | MongoDB Atlas | — | Persistência de dados |
| **ODM** | Mongoose | 9.x | Modelagem de dados |
| **Autenticação** | jsonwebtoken | 9.x | Tokens JWT stateless |
| **Hash de Senha** | bcryptjs | 3.x | Criptografia de senhas |
| **E-mail** | Nodemailer | 8.x | Envio de e-mail de recuperação |
| **Segurança** | Helmet | 8.x | Headers HTTP seguros |
| **CORS** | cors | 2.x | Controle de origens |
| **Rate Limiting** | express-rate-limit | 8.x | Proteção contra brute force |
| **Validação** | Joi | 18.x | Validação de schema |
| **Frontend** | HTML + Tailwind CSS | 3.x | Interface do usuário |
| **Deploy** | Vercel | — | Hospedagem frontend e backend |

---

## ⚙️ Guia de Instalação

### Pré-requisitos

- Node.js >= 18.x
- npm >= 9.x
- Conta no MongoDB Atlas
- Conta Gmail com App Password habilitada (para Nodemailer)

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/projeto-garq.git
cd projeto-garq
```

### 2. Configuração do Backend

```bash
cd backend
npm install
```

Crie o arquivo `.env` com base no exemplo abaixo:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/AdminGarq?retryWrites=true&w=majority
JWT_SECRET=<string-aleatoria-de-no-minimo-64-chars>
JWT_EXPIRE=7d
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=<google-app-password-16-chars>
FRONTEND_URL=http://localhost:5500
```

> ⚠️ **Nunca commite o arquivo `.env` real.** Adicione `.env` ao `.gitignore`.

```bash
# Rodar em desenvolvimento
npm run dev

# Rodar em produção
npm start
```

### 3. Configuração do Frontend

```bash
cd ../frontend
npm install
```

Para desenvolvimento local, abra `index.html` com o Live Server (VS Code) na porta `5500`.

O arquivo `src/config.js` detecta automaticamente o ambiente:

```js
// localhost → http://localhost:5000/api
// produção → https://garq-imoveis-backend.vercel.app/api
```

### 4. Deploy na Vercel

**Backend:**

```bash
cd backend
vercel --prod
```

**Frontend:**

```bash
cd frontend
vercel --prod
```

Certifique-se de configurar todas as variáveis de ambiente na dashboard da Vercel (Settings → Environment Variables).

---

## 📡 Documentação de Endpoints (API)

**Base URL (Produção):** `https://garq-imoveis-backend.vercel.app/api`

### Auth — `/api/auth`

#### `POST /register` — Cadastro de Usuário

**Body:**
```json
{
  "name": "João Silva",
  "email": "joao@email.com",
  "phone": "11999999999",
  "password": "minhasenha123"
}
```

**Resposta 201:**
```json
{
  "success": true,
  "token": "eyJhbGci...",
  "user": { "id": "...", "name": "João Silva", "email": "joao@email.com", "role": "user" }
}
```

**Erros:** `409` Email já cadastrado | `500` Erro no servidor

---

#### `POST /login` — Autenticação *(rate limited: 10 req/15min)*

**Body:**
```json
{ "email": "joao@email.com", "password": "minhasenha123" }
```

**Resposta 200:**
```json
{
  "success": true,
  "token": "eyJhbGci...",
  "user": { "id": "...", "name": "João Silva", "email": "joao@email.com", "role": "admin" }
}
```

**Erros:** `401` Credenciais inválidas | `429` Rate limit atingido

---

#### `POST /forgot-password` — Solicitar Recuperação *(rate limited)*

**Body:**
```json
{ "email": "joao@email.com" }
```

**Resposta 200:**
```json
{ "success": true }
```

**Comportamento:** Gera um token de 40 chars (hex), salva no usuário com expiração de 7 dias e envia e-mail com link de redefinição.

**Erros:** `404` E-mail não cadastrado | `500` Erro no envio

---

#### `POST /reset-password` — Redefinir Senha *(rate limited)*

**Body:**
```json
{ "token": "abc123...", "password": "novaSenha456" }
```

**Resposta 200:**
```json
{ "success": true, "message": "Senha atualizada!" }
```

**Erros:** `400` Token inválido ou expirado | `500` Erro interno

---

### Imóveis — `/api/imoveis`

#### `GET /` — Listar Todos os Imóveis *(público)*

**Resposta 200:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "...",
      "titulo": "Mansão Alphaville",
      "subtitulo": "Residência de Elite",
      "tipo": "casa",
      "isDestaque": true,
      "galeria": [{ "url": "https://...", "isPadrao": true }],
      "atributos": [{ "label": "Área Terreno", "value": "2.500 m²" }],
      "descricaoLonga": "...",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

---

#### `POST /` — Criar Imóvel 🔒 *(requer JWT)*

**Header:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "titulo": "Mansão Alphaville",
  "subtitulo": "Residência de Elite",
  "tipo": "casa",
  "isDestaque": true,
  "galeria": [{ "url": "https://link-da-imagem.com/foto.jpg", "isPadrao": true }],
  "atributos": [
    { "label": "Área Terreno", "value": "2.500 m²" },
    { "label": "Suítes", "value": "6" }
  ],
  "descricaoLonga": "Descrição completa do imóvel..."
}
```

**Resposta 201:** `{ "success": true, "data": { ... } }`

**Erros:** `401` Token ausente/inválido | `400` Dados inválidos

---

#### `PUT /:id` — Atualizar Imóvel 🔒 *(requer JWT)*

**Header:** `Authorization: Bearer <token>`

**Body:** Qualquer campo do schema acima (parcial ou completo).

**Resposta 200:** `{ "success": true, "data": { ...imovelAtualizado } }`

**Erros:** `404` Imóvel não encontrado | `401` Sem autorização

---

#### `DELETE /:id` — Excluir Imóvel 🔒 *(requer JWT)*

**Header:** `Authorization: Bearer <token>`

**Resposta 200:** `{ "success": true, "data": {} }`

**Erros:** `404` Imóvel não encontrado | `401` Sem autorização

---

## 🔐 Modelo de Segurança

- **Senhas** — Hash com bcryptjs (salt rounds = 10) antes da persistência
- **JWT** — Tokens stateless assinados com `JWT_SECRET`, expiração em 7 dias
- **Rate Limiting** — Login e recuperação de senha limitados a 10 req/15min por IP
- **Helmet** — Headers HTTP de segurança aplicados globalmente
- **CORS** — Allowlist explícita de origens autorizadas
- **Variáveis de Ambiente** — Credenciais nunca no código-fonte

---

## 🤝 Contribuição

1. Fork o repositório
2. Crie uma branch: `git checkout -b feature/minha-feature`
3. Commit: `git commit -m 'feat: adiciona X'`
4. Push: `git push origin feature/minha-feature`
5. Abra um Pull Request

---

## 📄 Licença

Proprietário — GARQ Invest © 2025. Todos os direitos reservados.