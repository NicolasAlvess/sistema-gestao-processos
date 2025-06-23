const express = require('express');
const db = require('./db');
const { authenticateToken } = require('./admin.guard');

const router = express.Router();

// Aplica o middleware de autenticação a todas as rotas
router.use(authenticateToken);

// ROTA: GET /api/dashboard/stats - Obter estatísticas para a dashboard
router.get('/stats', async (req, res) => {
    try {
        // Consulta 1: Contagem total de processos
        const totalResult = await db.query('SELECT COUNT(*) FROM processes');
        
        // Consulta 2: Contagem de processos por status
        const statusResult = await db.query(`
            SELECT status, COUNT(*) as count 
            FROM processes 
            GROUP BY status
        `);

        // Consulta 3: Contagem de processos com prazos a vencer nos próximos 7 dias
        const deadlineResult = await db.query(`
            SELECT COUNT(*) 
            FROM processes 
            WHERE 
                (initial_statement_deadline BETWEEN NOW() AND NOW() + interval '7 day') OR 
                (final_statement_deadline BETWEEN NOW() AND NOW() + interval '7 day')
        `);

        // Formata os dados para o frontend
        const stats = {
            totalProcesses: parseInt(totalResult.rows[0].count, 10),
            processesByStatus: statusResult.rows,
            upcomingDeadlines: parseInt(deadlineResult.rows[0].count, 10)
        };

        res.json(stats);

    } catch (error) {
        console.error('Erro ao buscar estatísticas da dashboard:', error);
        res.status(500).json({ message: 'Erro ao buscar estatísticas.' });
    }
});

module.exports = router;
