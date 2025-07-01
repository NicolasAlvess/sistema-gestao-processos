/*
 * ==========================================================================
 * FICHEIRO: backend/reports.routes.js (VERSÃO CORRIGIDA E COMPLETA)
 * ==========================================================================
 * - Rota /full-report agora recebe corretamente o parâmetro 'template'
 * - Adicionados logs detalhados para debug
 * - Melhor tratamento de erros
 */

const express = require('express');
const db = require('./db');
const { authenticateToken, requireGestorOrAdmin } = require('./admin.guard');
const router = express.Router();

// Importa o gerador de PDFs
const { generateReport } = require('./services/documentGenerator');

// Aplica autenticação a todas as rotas
router.use(authenticateToken);

/*
 * ==========================================================================
 * ROTA: Resumo de Processos para Dashboard
 * ==========================================================================
 */
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

        // Categoriza os resultados
        const createdBy = result.rows.filter(r => r.notes === 'Processo criado.');
        const archivedBy = result.rows.filter(r => r.to_status === 'arquivado');
        const deletedBy = result.rows.filter(r => r.to_status === 'excluido');

        res.json({ createdBy, archivedBy, deletedBy });

    } catch (error) {
        console.error('Erro ao gerar relatório de resumo:', error);
        res.status(500).json({ message: 'Erro ao gerar relatório.' });
    }
});

/*
 * ==========================================================================
 * ROTA CORRIGIDA: Gerar Relatório Completo em PDF
 * ==========================================================================
 * Agora recebe e processa corretamente o parâmetro 'template'
 */
router.get('/:id/full-report', async (req, res) => {
    try {
        const { id: processId } = req.params;
        const { template } = req.query; // Captura o template da query string

        // Validações
        if (!template) {
            console.error('[ERRO] Template não especificado na requisição');
            return res.status(400).json({ message: 'Parâmetro "template" é obrigatório' });
        }

        console.log(`[REPORTS] Gerando relatório - Processo: ${processId}, Template: ${template}`);

        // Gera o PDF (agora com o template)
        const pdfBuffer = await generateReport(processId, template);

        // Configura os headers para download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=relatorio_${processId}.pdf`);

        res.send(pdfBuffer);

    } catch (error) {
        console.error('[ERRO] Falha na geração do relatório:', error.message);

        // Mensagens de erro mais específicas
        const errorMessage = error.message.includes('Template desconhecido')
            ? 'Template selecionado é inválido'
            : 'Falha ao gerar o relatório';

        res.status(500).json({
            message: errorMessage,
            details: error.message
        });
    }
});

module.exports = router;