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
// ✨ Usamos a porta do ambiente ou 3000 como padrão
const port = process.env.PORT || 3000;

// --- MIDDLEWARES ---

// ✨ CORS ATUALIZADO: Removemos a origem fixa para permitir acesso do Render
app.use(cors());

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- REGISTRO DAS ROTAS DA API ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/processes', processRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reports', reportRoutes);


// ✨ ========================================================== ✨
// ✨ CÓDIGO ADICIONADO PARA SERVIR O FRONTEND EM PRODUÇÃO
// ✨ ========================================================== ✨
const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist', 'frontend');
app.use(express.static(frontendDistPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});


// --- CONFIGURAÇÃO DO SERVIDOR HTTP E WEBSOCKET ---
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const clients = new Map();

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

// Exportamos a função para que ela possa ser usada em outras partes do código
module.exports.sendNotification = sendNotification;

wss.on('connection', (ws, req) => {
  const parameters = new URLSearchParams(url.parse(req.url).search);
  const userId = parseInt(parameters.get('userId'), 10);

  if (userId && !isNaN(userId)) {
    clients.set(userId, ws);
    console.log(`[WebSocket] SUCESSO: Cliente conectado e registrado com User ID ${userId}`);
  } else {
    console.error('[WebSocket] ERRO: Cliente tentou conectar-se sem um User ID válido.');
    ws.close();
    return;
  }

  ws.on('message', async (message) => {
    try {
      console.log(`[WebSocket] MENSAGEM RECEBIDA: ${message}`);
      const parsedMessage = JSON.parse(message);

      if (parsedMessage.type === 'chat_message') {
        const { recipientId, text, senderId } = parsedMessage.payload;

        if (!recipientId || !text || !senderId) {
          console.error('[WebSocket] ERRO: Mensagem de chat recebida está incompleta.', parsedMessage);
          return;
        }

        console.log(`[WebSocket] A guardar mensagem de ${senderId} para ${recipientId} na base de dados...`);
        const dbResult = await db.query(
          'INSERT INTO chat_messages (sender_id, recipient_id, message_text) VALUES ($1, $2, $3) RETURNING id, created_at',
          [senderId, recipientId, text]
        );
        console.log(`[WebSocket] SUCESSO: Mensagem ID ${dbResult.rows[0].id} guardada na base de dados.`);

        const recipientWs = clients.get(recipientId);
        if (recipientWs && recipientWs.readyState === ws.OPEN) {
          const messageToSend = JSON.stringify({
            type: 'chat_message',
            payload: {
              ...parsedMessage.payload,
              id: dbResult.rows[0].id,
              created_at: dbResult.rows[0].created_at
            }
          });

          console.log(`[WebSocket] A ENVIAR para o destinatário ${recipientId}: ${messageToSend}`);
          recipientWs.send(messageToSend);
        } else {
          console.log(`[WebSocket] AVISO: Destinatário ${recipientId} não está online. A mensagem foi guardada.`);
        }
      } else {
        console.log('[WebSocket] AVISO: Mensagem recebida não é do tipo chat_message.', parsedMessage);
      }
    } catch (e) {
      console.error('[WebSocket] ERRO CRÍTICO ao processar a mensagem:', e);
    }
  });

  ws.on('close', () => {
    clients.forEach((clientWs, id) => {
      if (clientWs === ws) {
        clients.delete(id);
        console.log(`[WebSocket] Cliente desconectado: User ID ${id}`);
      }
    });
  });
});

server.listen(port, () => {
  console.log(`Servidor HTTP e WebSocket a escutar na porta ${port}`);
});