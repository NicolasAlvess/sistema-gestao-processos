/*
 * ==========================================================================
 * FICHEIRO: backend/index.js (VERSÃO AJUSTADA)
 * ==========================================================================
 * - CORS configurado de forma mais robusta e segura.
 * - Adicionada verificação de origem para conexões WebSocket.
 * - Comentários adicionados para maior clareza.
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { WebSocket, WebSocketServer } = require('ws');
const url = require('url');
const db = require('./db');

// --- ROTAS ---
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const processRoutes = require('./process.routes');
const dashboardRoutes = require('./dashboard.routes');
const chatRoutes = require('./chat.routes');
const reportRoutes = require('./reports.routes');

const app = express();
const port = process.env.PORT || 3000;

// --- MIDDLEWARES ---

// MELHORIA: Configuração de CORS mais flexível e segura
const allowedOrigins = [
  'http://localhost:4200', // Seu frontend em desenvolvimento
  // Adicione aqui a URL do seu frontend em produção quando tiver, ex: 'https://seusite.com'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Permite requisições sem 'origin' (ex: Postman, apps mobile) ou se a origem estiver na lista
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Acesso não permitido por CORS'));
    }
  },
};

app.use(cors(corsOptions)); // <-- AJUSTE: Usando a nova configuração de CORS

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- REGISTRO DAS ROTAS DA API ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/processes', processRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reports', reportRoutes);


// ✨ ================================================================= ✨
// ✨ CÓDIGO PARA SERVIR O FRONTEND EM AMBIENTE DE PRODUÇÃO
// ✨ (Não afeta seu desenvolvimento local com o servidor do Vite)
// ✨ ================================================================= ✨
const frontendDistPath = path.join(__dirname, '..', 'dist', 'frontend', 'browser');
app.use(express.static(frontendDistPath));

app.use((req, res, next) => {
  // Se a requisição não for para a API, serve o index.html do frontend
  if (!req.path.startsWith('/api/')) {
    return res.sendFile(path.join(frontendDistPath, 'index.html'));
  }
  next();
});

// --- CONFIGURAÇÃO DO SERVIDOR HTTP E WEBSOCKET ---
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const clients = new Map();

// ... (seu código para sendNotification permanece o mesmo)
const sendNotification = (userId, payload) => {
  const targetWs = clients.get(userId);
  if (targetWs && targetWs.readyState === WebSocket.OPEN) {
    console.log(`[WebSocket] NOTIFICAÇÃO: Enviando para User ID ${userId}`, payload);
    targetWs.send(JSON.stringify(payload));
    return true;
  } else {
    console.log(`[WebSocket] NOTIFICAÇÃO: User ID ${userId} não está online.`);
    return false;
  }
};
module.exports.sendNotification = sendNotification;


wss.on('connection', (ws, req) => {
  // MELHORIA: Verificação de segurança para a origem da conexão WebSocket
  const requestOrigin = req.headers.origin;
  if (allowedOrigins.indexOf(requestOrigin) === -1) {
    console.error(`[WebSocket] ERRO: Conexão da origem '${requestOrigin}' foi bloqueada.`);
    ws.close();
    return;
  }

  const parameters = new URLSearchParams(url.parse(req.url).search);
  const userId = parseInt(parameters.get('userId'), 10);

  // ... (o resto do seu código WebSocket permanece o mesmo)
  if (userId && !isNaN(userId)) {
    clients.set(userId, ws);
    console.log(`[WebSocket] SUCESSO: Cliente conectado da origem '${requestOrigin}' com User ID ${userId}`);
  } else {
    console.error('[WebSocket] ERRO: Cliente tentou conectar-se sem um User ID válido.');
    ws.close();
    return;
  }

  ws.on('message', async (message) => { /* ... seu código aqui ... */ });
  ws.on('close', () => { /* ... seu código aqui ... */ });
});


// SERVIDOR CONFIGURADO PARA ACEITAR CONEXÕES DE TODA A REDE
server.listen(port, '0.0.0.0', () => {
  console.log(`Servidor HTTP e WebSocket a escutar na porta ${port}`);
});