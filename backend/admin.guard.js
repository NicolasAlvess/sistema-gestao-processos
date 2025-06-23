/*
 * ==========================================================================
 * FICHEIRO: backend/admin.guard.js (Atualizado)
 * ==========================================================================
 * - O middleware 'authenticateToken' continua igual.
 * - Adicionámos novos middlewares para verificar perfis específicos.
 */

const jwt = require('jsonwebtoken');
const JWT_SECRET = 'seu_segredo_super_secreto_para_jwt'; // Use o mesmo segredo

/**
 * Middleware para verificar se o token JWT é válido e anexar os dados do utilizador ao 'req'.
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) return res.sendStatus(401); // Unauthorized

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Forbidden
    req.user = user; // Anexa o payload do token (ex: { id: 1, role: 'admin' })
    next();
  });
};

/**
 * Middleware para garantir que o utilizador é um Administrador.
 */
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acesso restrito a administradores.' });
  }
  next();
};

/**
 * NOVO: Middleware para garantir que o utilizador é um Gestor ou um Administrador.
 */
const requireGestorOrAdmin = (req, res, next) => {
  const allowedRoles = ['admin', 'gestor'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Acesso negado. Permissão de Gestor ou superior necessária.' });
  }
  next();
};

/**
 * NOVO: Middleware para garantir que o utilizador é um Auxiliar, Gestor ou Administrador.
 */
const requireAuxiliarOrAbove = (req, res, next) => {
  const allowedRoles = ['admin', 'gestor', 'auxiliar'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Acesso negado. Permissão de Auxiliar ou superior necessária.' });
  }
  next();
};


module.exports = {
  authenticateToken,
  requireAdmin,
  requireGestorOrAdmin, // Exportar o novo guarda
  requireAuxiliarOrAbove // Exportar o novo guarda
};
