/*
 * ==========================================================================
 * FICHEIRO: backend/user.routes.js (Corrigido)
 * ==========================================================================
 * - A proteção de 'requireAdmin' foi removida do middleware global do router.
 * - O middleware 'requireAdmin' foi aplicado especificamente à rota POST (criar utilizador).
 * - Agora, qualquer utilizador autenticado pode listar os utilizadores (necessário para o chat).
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('./db');
// Mantemos a importação de ambos os guardas
const { authenticateToken, requireAdmin } = require('./admin.guard');

const router = express.Router();

// APLICAR O MIDDLEWARE DE AUTENTICAÇÃO A TODAS AS ROTAS DESTE FICHEIRO
router.use(authenticateToken);

// ROTA: GET /api/users - Listar todos os utilizadores
// Esta rota agora só requer que o utilizador esteja autenticado.
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, name, email, role, posto_graduacao, nome_de_guerra FROM users ORDER BY name');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar utilizadores.' });
  }
});

// ROTA: POST /api/users - Criar um novo utilizador
// ESTA ROTA CONTINUA PROTEGIDA E SÓ PODE SER ACEDIDA POR ADMINS.
router.post('/', requireAdmin, async (req, res) => {
  const { name, email, password, role, posto_graduacao, nome_de_guerra } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = await db.query(
      `INSERT INTO users (name, email, password_hash, role, posto_graduacao, nome_de_guerra) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, name, email, role, posto_graduacao, nome_de_guerra`,
      [name, email, password_hash, role, posto_graduacao, nome_de_guerra]
    );
    res.status(201).json(newUser.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao registrar utilizador.' });
  }
});

module.exports = router;
