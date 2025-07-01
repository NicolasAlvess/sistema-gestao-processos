/*
 * ==========================================================================
 * FICHEIRO: backend/process.routes.js (VERSÃO FINAL E COMPLETA)
 * ==========================================================================
 * - A rota PUT /:id foi atualizada para ser mais robusta, atualizando
 * dinamicamente apenas os campos recebidos, incluindo os do PACCR.
 * - Todas as outras rotas (PATCH, POST, GET) foram restauradas e mantidas.
 * ==========================================================================
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const {
    authenticateToken,
    requireAdmin,
    requireGestorOrAdmin,
    requireAuxiliarOrAbove
} = require('./admin.guard');

const router = express.Router();

// Configuração do Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        fs.mkdirSync('uploads/', { recursive: true });
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'));
    }
});
const upload = multer({ storage: storage });

// Aplica o middleware de autenticação a TODAS as rotas deste ficheiro
router.use(authenticateToken);

// ROTA: GET /api/processes - Listar todos os processos
router.get('/', async (req, res) => {
    const { searchTerm, status, type, page = 1, limit = 10, sortBy = 'creation_desc' } = req.query;
    const { id: userId, role: userRole } = req.user;
    const offset = (page - 1) * limit;

    let baseQuery = `FROM processes p LEFT JOIN users u ON p.created_by_user_id = u.id`;
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (userRole === 'encarregado') {
        conditions.push(`p.encarregado_user_id = $${paramIndex++}`);
        params.push(userId);
    }

    if (searchTerm) { conditions.push(`(p.process_number ILIKE $${paramIndex} OR p.interested_party ILIKE $${paramIndex})`); params.push(`%${searchTerm}%`); paramIndex++; }
    if (status) { conditions.push(`p.status = $${paramIndex++}`); params.push(status); }
    if (type) { conditions.push(`p.type = $${paramIndex++}`); params.push(type); }

    if (conditions.length > 0) {
        baseQuery += ' WHERE ' + conditions.join(' AND ');
    }

    let orderByClause = 'ORDER BY p.created_at DESC';
    if (sortBy === 'deadline_asc') {
        orderByClause = `
        ORDER BY
          (CASE
            WHEN p.status = 'Aguardado prazo alegações iniciais' THEN p.initial_statement_deadline
            WHEN p.status = 'Aguardando prazo alegações finais' THEN p.final_statement_deadline
            ELSE NULL
          END) ASC NULLS LAST,
          p.created_at DESC
      `;
    }

    try {
        const totalResult = await db.query(`SELECT COUNT(p.id) ${baseQuery}`, params);
        const totalItems = parseInt(totalResult.rows[0].count, 10);

        const dataQuery = `SELECT p.id, p.process_number, p.type, p.status, p.interested_party, u.name as created_by, p.initial_statement_deadline, p.final_statement_deadline ${baseQuery} ${orderByClause} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        const paginatedParams = [...params, limit, offset];
        const { rows: processes } = await db.query(dataQuery, paginatedParams);

        res.json({
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
            currentPage: parseInt(page, 10),
            processes
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao buscar processos.' });
    }
});


// ROTA: POST /api/processes - Criar um novo processo
router.post('/', requireGestorOrAdmin, async (req, res) => {
    const {
        process_number, type, interested_party, cr, cpf_cnpj, reason,
        portaria_instauracao, encarregado_user_id,
        boletim_ocorrencia, inquerito_policial, numero_oficio,
        email, telefone, cep, logradouro, numero, complemento, bairro, cidade, estado
    } = req.body;
    const created_by_user_id = req.user.id;

    if (!process_number || !type || !interested_party || !reason) {
        return res.status(400).json({ message: 'Número do processo, tipo, interessado e motivo são obrigatórios.' });
    }

    try {
        const newProcessResult = await db.query(
            `INSERT INTO processes (process_number, type, interested_party, cr, cpf_cnpj, reason, created_by_user_id, status, portaria_instauracao, encarregado_user_id, boletim_ocorrencia, inquerito_policial, numero_oficio, email, telefone, cep, logradouro, numero, complemento, bairro, cidade, estado) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'instaurado', $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21) RETURNING *`,
            [process_number, type, interested_party, cr, cpf_cnpj, reason, created_by_user_id, portaria_instauracao, encarregado_user_id || null, boletim_ocorrencia || null, inquerito_policial || null, numero_oficio || null, email || null, telefone || null, cep || null, logradouro || null, numero || null, complemento || null, bairro || null, cidade || null, estado || null]
        );
        const newProcess = newProcessResult.rows[0];

        await db.query(
            'INSERT INTO process_history (process_id, user_id, to_status, notes, process_number) VALUES ($1, $2, $3, $4, $5)',
            [newProcess.id, created_by_user_id, newProcess.status, 'Processo criado.', newProcess.process_number]
        );

        res.status(201).json(newProcess);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao criar processo. O número do processo já pode existir.' });
    }
});


// ROTA: GET /api/processes/:id - Obter detalhes de um processo
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const { id: userId, role: userRole } = req.user;
    try {
        const processResult = await db.query('SELECT * FROM processes WHERE id = $1', [id]);
        if (processResult.rows.length === 0) {
            return res.status(404).json({ message: 'Processo não encontrado.' });
        }
        const process = processResult.rows[0];

        if (userRole === 'encarregado' && process.encarregado_user_id !== userId) {
            return res.status(403).json({ message: 'Acesso negado a este processo.' });
        }

        const historyResult = await db.query(`SELECT h.*, u.name as user_name FROM process_history h LEFT JOIN users u ON h.user_id = u.id WHERE h.process_id = $1 ORDER BY h.change_date DESC`, [id]);
        const documentsResult = await db.query('SELECT * FROM documents WHERE process_id = $1 ORDER BY uploaded_at DESC', [id]);
        const firearmsResult = await db.query('SELECT * FROM firearms WHERE process_id = $1 ORDER BY created_at ASC', [id]);

        res.json({
            ...process,
            history: historyResult.rows,
            documents: documentsResult.rows,
            firearms: firearmsResult.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao buscar detalhes do processo.' });
    }
});


// ✨ ========================================================== ✨
// ✨ ROTA ATUALIZADA PARA LIDAR COM TODOS OS CAMPOS, INCLUINDO PACCR
// ✨ ========================================================== ✨
router.put('/:id', requireGestorOrAdmin, async (req, res) => {
    const { id } = req.params;
    const {
        // Campos gerais
        process_number, type, interested_party, cr, cpf_cnpj, reason,
        portaria_instauracao, encarregado_user_id,
        boletim_ocorrencia, inquerito_policial, numero_oficio,
        email, telefone, cep, logradouro, numero, complemento, bairro, cidade, estado,
        // Campos específicos do PACCR (textos editáveis)
        juntada_docs_1, juntada_docs_2, relatorio_apreciacao_defesa, relatorio_conclusao,
    } = req.body;

    const fields = [];
    const values = [];
    let queryIndex = 1;

    const addField = (name, value) => {
        if (value !== undefined) {
            fields.push(`${name} = $${queryIndex++}`);
            values.push(value);
        }
    };

    // Adiciona todos os campos possíveis à query de atualização
    addField('process_number', process_number);
    addField('type', type);
    addField('interested_party', interested_party);
    addField('cr', cr);
    addField('cpf_cnpj', cpf_cnpj);
    addField('reason', reason);
    addField('portaria_instauracao', portaria_instauracao);
    addField('encarregado_user_id', encarregado_user_id);
    addField('boletim_ocorrencia', boletim_ocorrencia);
    addField('inquerito_policial', inquerito_policial);
    addField('numero_oficio', numero_oficio);
    addField('email', email);
    addField('telefone', telefone);
    addField('cep', cep);
    addField('logradouro', logradouro);
    addField('numero', numero);
    addField('complemento', complemento);
    addField('bairro', bairro);
    addField('cidade', cidade);
    addField('estado', estado);
    addField('juntada_docs_1', juntada_docs_1);
    addField('juntada_docs_2', juntada_docs_2);
    addField('relatorio_apreciacao_defesa', relatorio_apreciacao_defesa);
    addField('relatorio_conclusao', relatorio_conclusao);

    if (fields.length === 0) {
        return res.status(400).json({ message: 'Nenhum campo fornecido para atualização.' });
    }

    try {
        const updateQuery = `
            UPDATE processes 
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $${queryIndex}
            RETURNING *;
        `;
        values.push(id); // Adiciona o ID ao final para a cláusula WHERE

        const { rows } = await db.query(updateQuery, values);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Processo não encontrado para atualizar.' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar processo:', error);
        res.status(500).json({ message: 'Erro de servidor ao atualizar o processo.' });
    }
});


// ROTA: PATCH /api/processes/:id/status - Mudar o status (ex: para arquivado, excluido)
router.patch('/:id/status', requireGestorOrAdmin, async (req, res) => {
    const { id: processId } = req.params;
    const { status: newStatus, notes } = req.body;
    const { id: userId, name: userName } = req.user;

    if (!newStatus || (newStatus !== 'arquivado' && newStatus !== 'excluido')) {
        return res.status(400).json({ message: "O novo status é obrigatório e deve ser 'arquivado' ou 'excluido'." });
    }

    try {
        const processResult = await db.query('SELECT * FROM processes WHERE id = $1', [processId]);
        if (processResult.rows.length === 0) {
            return res.status(404).json({ message: 'Processo não encontrado.' });
        }
        const currentProcess = processResult.rows[0];

        const updatedProcess = await db.query(
            `UPDATE processes SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
            [newStatus, processId]
        );

        const historyNotes = notes || `Status alterado para ${newStatus} por ${userName}.`;
        await db.query(
            'INSERT INTO process_history (process_id, user_id, from_status, to_status, notes, process_number) VALUES ($1, $2, $3, $4, $5, $6)',
            [processId, userId, currentProcess.status, newStatus, historyNotes, currentProcess.process_number]
        );

        res.status(200).json(updatedProcess.rows[0]);
    } catch (error) {
        console.error(`Erro ao alterar status para ${newStatus}:`, error);
        res.status(500).json({ message: `Erro de servidor ao alterar o status do processo.` });
    }
});

// ROTA: PATCH /api/processes/:id/dates - Atualizar datas de notificação e status
router.patch('/:id/dates', requireAuxiliarOrAbove, async (req, res) => {
    const { id } = req.params;
    const {
        notification1_sent_date,
        notification1_received_date,
        notification2_sent_date,
        notification2_received_date
    } = req.body;
    const userId = req.user.id;

    try {
        const currentProcessResult = await db.query('SELECT * FROM processes WHERE id = $1', [id]);
        if (currentProcessResult.rows.length === 0) {
            return res.status(404).json({ message: 'Processo não encontrado.' });
        }
        const currentProcess = currentProcessResult.rows[0];
        let newStatus = currentProcess.status;

        if (notification2_received_date) { newStatus = 'Aguardando prazo alegações finais'; }
        else if (notification2_sent_date) { newStatus = 'Aguardando recebimento da segunda notificação'; }
        else if (notification1_received_date) { newStatus = 'Aguardado prazo alegações iniciais'; }
        else if (notification1_sent_date) { newStatus = 'Aguardando recebimento da primeira notificação'; }

        const params = [
            notification1_sent_date || null,
            notification1_received_date || null,
            notification2_sent_date || null,
            notification2_received_date || null,
            newStatus,
            id
        ];

        const updatedProcess = await db.query(
            `UPDATE processes SET 
                notification1_sent_date = $1, notification1_received_date = $2, 
                notification2_sent_date = $3, notification2_received_date = $4,
                status = $5, updated_at = CURRENT_TIMESTAMP 
              WHERE id = $6 RETURNING *`,
            params
        );

        if (newStatus !== currentProcess.status) {
            await db.query(
                'INSERT INTO process_history (process_id, user_id, from_status, to_status, notes, process_number) VALUES ($1, $2, $3, $4, $5, $6)',
                [id, userId, currentProcess.status, newStatus, 'Status atualizado automaticamente via edição de datas.', currentProcess.process_number]
            );
        }
        res.json(updatedProcess.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao atualizar as datas do processo.' });
    }
});

// ROTA: PATCH /api/processes/:id/deadlines - Atualizar as datas limite do processo
router.patch('/:id/deadlines', requireAuxiliarOrAbove, async (req, res) => {
    const { id } = req.params;
    const {
        initial_statement_deadline,
        final_statement_deadline
    } = req.body;

    try {
        const currentProcess = await db.query('SELECT * FROM processes WHERE id = $1', [id]);
        if (currentProcess.rows.length === 0) {
            return res.status(404).json({ message: 'Processo não encontrado.' });
        }

        const params = [
            initial_statement_deadline || currentProcess.rows[0].initial_statement_deadline,
            final_statement_deadline || currentProcess.rows[0].final_statement_deadline,
            id
        ];

        const updatedProcess = await db.query(
            `UPDATE processes SET 
                initial_statement_deadline = $1, 
                final_statement_deadline = $2,
                updated_at = CURRENT_TIMESTAMP 
              WHERE id = $3 RETURNING *`,
            params
        );

        res.json(updatedProcess.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao atualizar os prazos do processo.' });
    }
});


// ROTA: POST /api/processes/:id/documents - Fazer upload de um documento
router.post('/:id/documents', requireAuxiliarOrAbove, upload.single('file'), async (req, res) => {
    const { id: process_id } = req.params;
    const { document_type } = req.body;
    const { filename: file_name, path: file_path, mimetype: mime_type } = req.file;
    const uploaded_by_user_id = req.user.id;

    if (!req.file || !document_type) {
        return res.status(400).json({ message: 'Ficheiro e tipo de documento são obrigatórios.' });
    }

    try {
        const newDocument = await db.query(
            'INSERT INTO documents (process_id, file_name, file_path, mime_type, document_type, uploaded_by_user_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [process_id, file_name, file_path, mime_type, document_type, uploaded_by_user_id]
        );
        res.status(201).json(newDocument.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao guardar o documento.' });
    }
});

// ROTA: POST /api/processes/:id/firearms - Adicionar uma nova arma
router.post('/:id/firearms', requireAuxiliarOrAbove, async (req, res) => {
    const { id: processId } = req.params;
    const { serial_number, model, caliber, status } = req.body;

    if (!serial_number || !model || !caliber || !status) {
        return res.status(400).json({ message: 'Todos os campos da arma são obrigatórios.' });
    }

    try {
        const newFirearm = await db.query(
            `INSERT INTO firearms (process_id, serial_number, model, caliber, status) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [processId, serial_number, model, caliber, status]
        );
        res.status(201).json(newFirearm.rows[0]);
    } catch (error) {
        console.error('Erro ao adicionar arma:', error);
        res.status(500).json({ message: 'Erro de servidor ao adicionar a arma.' });
    }
});


// ROTA: PATCH /api/processes/:id/finalize - Finalizar um processo
router.patch('/:id/finalize', requireAuxiliarOrAbove, upload.single('solutionFile'), async (req, res) => {
    const { id: processId } = req.params;
    const { publicationDate, bulletinNumber } = req.body;
    const { id: userId, name: userName } = req.user;

    if (!req.file || !publicationDate || !bulletinNumber) {
        return res.status(400).json({ message: 'Arquivo da solução, data de publicação e número do boletim são obrigatórios.' });
    }

    try {
        const currentProcess = await db.query('SELECT * FROM processes WHERE id = $1', [processId]);
        if (currentProcess.rows.length === 0) {
            return res.status(404).json({ message: 'Processo não encontrado.' });
        }
        const currentProcessData = currentProcess.rows[0];

        const updatedProcess = await db.query(
            `UPDATE processes 
                SET final_solution_publication_date = $1,
                    final_solution_bulletin_number = $2,
                    status = 'arquivado',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3 RETURNING *`,
            [publicationDate, bulletinNumber, processId]
        );

        const { filename: file_name, path: file_path, mimetype: mime_type } = req.file;
        await db.query(
            'INSERT INTO documents (process_id, file_name, file_path, mime_type, document_type, uploaded_by_user_id) VALUES ($1, $2, $3, $4, $5, $6)',
            [processId, file_name, file_path, mime_type, 'Solução Final', userId]
        );

        await db.query(
            'INSERT INTO process_history (process_id, user_id, from_status, to_status, notes, process_number) VALUES ($1, $2, $3, $4, $5, $6)',
            [processId, userId, currentProcessData.status, 'arquivado', `Processo finalizado e publicado no boletim ${bulletinNumber} por ${userName}.`, currentProcessData.process_number]
        );

        const { sendNotification } = require('../index');
        const encarregadoId = updatedProcess.rows[0].encarregado_user_id;
        if (encarregadoId) {
            sendNotification(encarregadoId, {
                type: 'PROCESS_FINALIZED',
                payload: {
                    message: `O processo ${updatedProcess.rows[0].process_number} foi finalizado.`,
                    processId: processId
                }
            });
        }
        res.json(updatedProcess.rows[0]);

    } catch (error) {
        console.error('Erro ao finalizar processo:', error);
        res.status(500).json({ message: 'Erro de servidor ao finalizar o processo.' });
    }
});


// ROTA: PATCH /api/processes/:id/closing-dates - Atualizar as datas de GRU/PC
router.patch('/:id/closing-dates', requireAuxiliarOrAbove, async (req, res) => {
    const { id: processId } = req.params;
    const {
        solution_sent_date, solution_received_date,
        gru_sent_date, gru_received_date, gru_payment_deadline,
        pc_sent_date, pc_received_date
    } = req.body;

    try {
        const currentProcessResult = await db.query('SELECT status, process_number FROM processes WHERE id = $1', [processId]);
        if (currentProcessResult.rows.length === 0) {
            return res.status(404).json({ message: 'Processo não encontrado.' });
        }
        const currentProcessData = currentProcessResult.rows[0];

        const updatedProcess = await db.query(
            `UPDATE processes SET solution_sent_date = $1, solution_received_date = $2, gru_sent_date = $3, gru_received_date = $4, gru_payment_deadline = $5, pc_sent_date = $6, pc_received_date = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *`,
            [
                solution_sent_date || null, solution_received_date || null,
                gru_sent_date || null, gru_received_date || null, gru_payment_deadline || null,
                pc_sent_date || null, pc_received_date || null,
                processId
            ]
        );

        if (updatedProcess.rows.length === 0) {
            return res.status(404).json({ message: 'Processo não encontrado (após a atualização).' });
        }

        await db.query(
            'INSERT INTO process_history (process_id, user_id, from_status, to_status, notes, process_number) VALUES ($1, $2, $3, $4, $5, $6)',
            [processId, req.user.id, currentProcessData.status, currentProcessData.status, 'Datas de cumprimento foram atualizadas.', currentProcessData.process_number]
        );
        res.json(updatedProcess.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar datas de finalização:', error);
        res.status(500).json({ message: 'Erro de servidor ao atualizar as datas.' });
    }
});


module.exports = router;
