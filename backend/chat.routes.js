const express = require('express');
const db = require('./db');
const { authenticateToken } = require('./admin.guard');

const router = express.Router();

// Aplica autenticação a todas as rotas de chat
router.use(authenticateToken);

// ROTA: Obter o histórico de conversa com um utilizador específico
router.get('/:userId', async (req, res) => {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;

    try {
        const { rows } = await db.query(
            `SELECT id, sender_id, recipient_id, message_text, created_at, is_read
             FROM chat_messages
             WHERE (sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1)
             ORDER BY created_at ASC`,
            [currentUserId, otherUserId]
        );
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar histórico do chat:', error);
        res.status(500).json({ message: 'Erro interno ao buscar mensagens.' });
    }
});


// ✨ ROTA NOVA 1: Obter a contagem total de mensagens não lidas
router.get('/unread/count', async (req, res) => {
    const currentUserId = req.user.id;
    try {
        const { rows } = await db.query(
            'SELECT COUNT(*) FROM chat_messages WHERE recipient_id = $1 AND is_read = FALSE',
            [currentUserId]
        );
        const count = parseInt(rows[0].count, 10);
        res.json({ count });
    } catch (error) {
        console.error('Erro ao buscar contagem de não lidas:', error);
        res.status(500).json({ message: 'Erro ao buscar contagem de mensagens.' });
    }
});


// ✨ ROTA NOVA 2: Marcar mensagens de uma conversa como lidas
router.post('/mark-as-read', async (req, res) => {
    const currentUserId = req.user.id;
    const { senderId } = req.body; // O ID do utilizador com quem estamos a conversar

    if (!senderId) {
        return res.status(400).json({ message: 'O ID do remetente é obrigatório.' });
    }

    try {
        await db.query(
            'UPDATE chat_messages SET is_read = TRUE WHERE recipient_id = $1 AND sender_id = $2 AND is_read = FALSE',
            [currentUserId, senderId]
        );
        res.status(200).json({ message: 'Mensagens marcadas como lidas.' });
    } catch (error) {
        console.error('Erro ao marcar mensagens como lidas:', error);
        res.status(500).json({ message: 'Erro ao atualizar mensagens.' });
    }
});


// ✨ ROTA NOVA 3: Obter a contagem de não lidas agrupada por utilizador
router.get('/unread/by-user', async (req, res) => {
    const currentUserId = req.user.id;
    try {
        const { rows } = await db.query(
            `SELECT sender_id, COUNT(*) as unread_count
             FROM chat_messages
             WHERE recipient_id = $1 AND is_read = FALSE
             GROUP BY sender_id`,
            [currentUserId]
        );
        // Transforma o resultado num formato mais fácil de usar no frontend
        const counts = rows.reduce((acc, row) => {
            acc[row.sender_id] = parseInt(row.unread_count, 10);
            return acc;
        }, {});
        res.json(counts);
    } catch (error) {
        console.error('Erro ao buscar contagem por utilizador:', error);
        res.status(500).json({ message: 'Erro ao buscar contagens.' });
    }
});

module.exports = router;