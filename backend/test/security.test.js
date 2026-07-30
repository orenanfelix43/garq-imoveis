process.env.NODE_ENV = 'test';
process.env.SESSION_TTL_HOURS = '1';
process.env.CORS_ORIGINS = 'http://localhost:5500';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { JSDOM } = require('jsdom');

const app = require('../src/app');
const User = require('../src/models/User');
const Cliente = require('../src/models/Cliente');
const Imovel = require('../src/models/Imovel');
const Documento = require('../src/models/Documento');
const Session = require('../src/models/Session');
const cloudinary = require('../src/config/cloudinary');
const { decodeAndValidate, MAX_BYTES } = require('../src/services/fileValidation');

let mongo;
cloudinary.uploader.upload = async () => ({ secure_url: 'https://res.cloudinary.com/example/authenticated/document.pdf', public_id: 'test/document' });
cloudinary.uploader.destroy = async () => ({ result: 'ok' });
cloudinary.utils.private_download_url = () => 'https://res.cloudinary.com/example/signed?expires=1&signature=test';

test.before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
});
test.after(async () => { await mongoose.disconnect(); await mongo.stop(); });
test.beforeEach(async () => mongoose.connection.dropDatabase());

function csrfFrom(response) {
    const cookies = response.headers['set-cookie'] || [];
    const item = cookies.find(cookie => cookie.startsWith('XSRF-TOKEN='));
    return item && decodeURIComponent(item.split(';')[0].split('=')[1]);
}

async function login(agent, email, password = 'StrongPass123!') {
    const response = await agent.post('/api/auth/login').send({ email, password }).expect(200);
    return csrfFrom(response);
}

async function user(role, suffix) {
    return User.create({ name: `${role} ${suffix}`, email: `${role}-${suffix}@example.test`, phone: '11999999999', password: 'StrongPass123!', role });
}

test('sessão opaca é httpOnly, exige CSRF e pode ser revogada no logout', async () => {
    const admin = await user('admin', 'session');
    const agent = request.agent(app);
    const loginResponse = await agent.post('/api/auth/login').send({ email: admin.email, password: 'StrongPass123!' }).expect(200);
    assert.equal(loginResponse.body.token, undefined);
    assert.match(loginResponse.headers['set-cookie'].join(';'), /garq_session=.*HttpOnly/i);
    const csrf = csrfFrom(loginResponse);
    await agent.post('/api/auth/logout').expect(403);
    await agent.post('/api/auth/logout').set('X-CSRF-Token', csrf).expect(200);
    await agent.get('/api/auth/session').expect(401);
    assert.equal(await Session.countDocuments({ revokedAt: { $ne: null } }), 1);
    await request(app).get('/api/auth/session').set('Cookie', 'garq_session=invalid').expect(401);

    const expiringAgent = request.agent(app);
    await login(expiringAgent, admin.email);
    await Session.updateMany({ userId: admin._id, revokedAt: null }, { expiresAt: new Date(Date.now() - 1000) });
    await expiringAgent.get('/api/auth/session').expect(401);
});

test('RBAC de imóveis bloqueia anônimo/cliente e não expõe imóvel oculto por ID', async () => {
    const admin = await user('admin', 'property');
    const client = await user('cliente', 'property');
    const hidden = await Imovel.create({ titulo: 'Oculto', subtitulo: 'Local', tipo: 'casa', descricaoLonga: 'x', isVisible: false, user: admin._id });
    const visible = await Imovel.create({ titulo: 'Visível', subtitulo: 'Local', tipo: 'casa', descricaoLonga: 'x', isVisible: true, user: admin._id });
    await request(app).get(`/api/imoveis/${hidden._id}`).expect(404);
    await request(app).get(`/api/imoveis/${visible._id}`).expect(200);
    await request(app).post('/api/imoveis').send({}).expect(401);
    const agent = request.agent(app); const csrf = await login(agent, client.email);
    await agent.post('/api/imoveis').set('X-CSRF-Token', csrf).send({ titulo: 'X' }).expect(403);
    await agent.get('/api/imoveis/admin/todos').expect(403);
    const adminAgent = request.agent(app); const adminCsrf = await login(adminAgent, admin.email);
    await adminAgent.get('/api/imoveis/admin/todos').expect(200);
    const created = await adminAgent.post('/api/imoveis').set('X-CSRF-Token', adminCsrf).send({ titulo: 'Novo', subtitulo: 'Local', tipo: 'casa', descricaoLonga: 'Descrição', galeria: [] }).expect(201);
    await adminAgent.put(`/api/imoveis/${created.body.data._id}`).set('X-CSRF-Token', adminCsrf).send({ titulo: 'Atualizado' }).expect(200);
    await adminAgent.patch(`/api/imoveis/${created.body.data._id}/visibilidade`).set('X-CSRF-Token', adminCsrf).expect(200);
    await adminAgent.delete(`/api/imoveis/${created.body.data._id}`).set('X-CSRF-Token', adminCsrf).expect(200);
});

test('autorização por objeto impede documentos cruzados entre dois clientes', async () => {
    const admin = await user('admin', 'docs');
    const clientA = await user('cliente', 'a');
    const clientB = await user('cliente', 'b');
    const propertyA = await Imovel.create({ titulo: 'A', subtitulo: 'A', tipo: 'casa', descricaoLonga: 'A', user: admin._id });
    const propertyB = await Imovel.create({ titulo: 'B', subtitulo: 'B', tipo: 'casa', descricaoLonga: 'B', user: admin._id });
    await Cliente.create({ nome: 'A', telefone: '1', email: clientA.email, userId: clientA._id, criadoPor: admin._id, imoveis: [{ imovelId: propertyA._id }] });
    await Cliente.create({ nome: 'B', telefone: '2', email: clientB.email, userId: clientB._id, criadoPor: admin._id, imoveis: [{ imovelId: propertyB._id }] });
    const doc = await Documento.create({ imovelId: propertyA._id, nome: 'contrato.pdf', tipo: 'application/pdf', tamanho: 10, url: 'https://legacy.invalid/doc', public_id: 'legacy', uploadadoPor: admin._id });
    const agentA = request.agent(app); await login(agentA, clientA.email);
    const agentB = request.agent(app); await login(agentB, clientB.email);
    await agentA.get(`/api/imoveis/${propertyA._id}/documentos`).expect(200);
    await agentB.get(`/api/imoveis/${propertyA._id}/documentos`).expect(404);
    await agentB.get(`/api/imoveis/${propertyA._id}/documentos/${doc._id}/download`).expect(404);
    const csrfA = csrfFrom(await agentA.post('/api/auth/login').send({ email: clientA.email, password: 'StrongPass123!' }));
    await agentA.delete(`/api/imoveis/${propertyA._id}/documentos/${doc._id}`).set('X-CSRF-Token', csrfA).expect(403);

    const adminAgent = request.agent(app); const adminCsrf = await login(adminAgent, admin.email);
    const pdf = Buffer.from('%PDF-1.7\n<<>>');
    const upload = await adminAgent.post(`/api/imoveis/${propertyA._id}/documentos`).set('X-CSRF-Token', adminCsrf).send({
        nome: 'novo.pdf', tipo: 'application/pdf', tamanho: 1,
        dados: `data:application/pdf;base64,${pdf.toString('base64')}`,
    }).expect(201);
    assert.equal(upload.body.data.url, undefined);
    assert.equal(upload.body.data.accessMode, 'authenticated');
    await adminAgent.delete(`/api/imoveis/${propertyA._id}/documentos/${upload.body.data._id}`).set('X-CSRF-Token', adminCsrf).expect(200);
});

test('upload valida tamanho real, assinatura e bloqueia PDF ativo', () => {
    const pdf = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>');
    const valid = decodeAndValidate({ nome: 'a.pdf', tipo: 'application/pdf', dados: `data:application/pdf;base64,${pdf.toString('base64')}` });
    assert.equal(valid.tamanho, pdf.length);
    assert.throws(() => decodeAndValidate({ nome: 'a.pdf', tipo: 'application/pdf', dados: `data:application/pdf;base64,${Buffer.from('%PDF-1.7 /JavaScript').toString('base64')}` }));
    assert.throws(() => decodeAndValidate({ nome: 'a.pdf', tipo: 'application/pdf', dados: `data:application/pdf;base64,${Buffer.from('not pdf').toString('base64')}` }));
    assert.throws(() => decodeAndValidate({ nome: 'a.txt', tipo: 'text/plain', dados: `data:text/plain;base64,${Buffer.alloc(MAX_BYTES + 1, 65).toString('base64')}` }));
});

test('payloads XSS em nome, e-mail, descrição, atributo, SVG e imagem viram texto', async () => {
    const dom = new JSDOM('<div id="root"></div>');
    global.document = dom.window.document;
    global.HTMLElement = dom.window.HTMLElement;
    global.HTMLImageElement = dom.window.HTMLImageElement;
    const source = fs.readFileSync(path.join(__dirname, '../../frontend/src/ui-helpers.js'), 'utf8');
    const ui = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
    const payloads = ['</p><img src=x onerror=alert(1)>', '\"><svg onload=alert(1)>', "x' onclick='alert(1)", '<script>alert(1)</script>'];
    for (const payload of payloads) {
        const root = document.getElementById('root');
        root.innerHTML = `<p>${ui.esc(payload)}</p>`;
        assert.equal(root.querySelector('p').textContent, payload);
        assert.equal(root.querySelector('img,svg,script'), null);
    }
});

test('frontend não contém handlers inline nem persistência de token', () => {
    const frontend = path.join(__dirname, '../../frontend');
    const files = fs.readdirSync(frontend, { recursive: true }).filter(name => {
        const target = path.join(frontend, name);
        return /\.(html|js)$/.test(name) && !name.startsWith('node_modules') && !name.startsWith('dist') && fs.statSync(target).isFile();
    });
    for (const name of files) {
        const source = fs.readFileSync(path.join(frontend, name), 'utf8');
        assert.doesNotMatch(source, /\son[a-z]+\s*=/i, name);
        assert.doesNotMatch(source, /localStorage\.setItem\([^)]*(?:token|auth)/i, name);
    }
});

test('E2E mínimo: login, painel administrativo e área do cliente', async () => {
    const admin = await user('admin', 'e2e');
    const client = await user('cliente', 'e2e');
    await Cliente.create({ nome: 'Cliente E2E', telefone: '1', email: client.email, userId: client._id, criadoPor: admin._id, imoveis: [] });

    const adminAgent = request.agent(app);
    await login(adminAgent, admin.email);
    await adminAgent.get('/api/imoveis/admin/todos').expect(200);
    const adminDom = new JSDOM(fs.readFileSync(path.join(__dirname, '../../frontend/admin.html'), 'utf8'));
    assert.ok(adminDom.window.document.getElementById('property-list'));

    const clientAgent = request.agent(app);
    await login(clientAgent, client.email);
    await clientAgent.get('/api/clientes/minha-area').expect(200);
    const clientDom = new JSDOM(fs.readFileSync(path.join(__dirname, '../../frontend/area-cliente.html'), 'utf8'));
    assert.ok(clientDom.window.document.getElementById('imoveis-container'));
});
