/*
 * ==========================================================================
 * FICHEIRO: backend/reports.routes.js (CORRIGIDO)
 * ==========================================================================
 * - A consulta SQL foi atualizada para usar a coluna 'process_number'
 * da tabela de histórico, garantindo que os processos excluídos apareçam.
 */
const express = require('express');
const db = require('./db');
const { authenticateToken, requireGestorOrAdmin } = require('./admin.guard');
const router = express.Router();

router.use(authenticateToken);

router.get('/process-summary', requireGestorOrAdmin, async (req, res) => {
    try {
        const query = `
            SELECT h.process_number, u.name as user_name, h.change_date, h.to_status, h.notes
            FROM process_history h
            JOIN users u ON h.user_id = u.id
            WHERE h.notes = 'Processo criado.' OR h.to_status IN ('arquivado', 'excluido')
            ORDER BY h.change_date DESC;
        `;
        const result = await db.query(query);

        // Separa os resultados em categorias
        const createdBy = result.rows.filter(r => r.notes === 'Processo criado.');
        const archivedBy = result.rows.filter(r => r.to_status === 'arquivado');
        const deletedBy = result.rows.filter(r => r.to_status === 'excluido');

        res.json({
            createdBy,
            archivedBy,
            deletedBy
        });

    } catch (error) {
        console.error('Erro ao gerar relatório de resumo de processos:', error);
        res.status(500).json({ message: 'Erro de servidor ao gerar o relatório.' });
    }
});

module.exports = router;
