// dentro de backend/db.js - VERSÃO CORRIGIDA
const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,

  /*
   * ===================================================================
   * ✨ ADICIONE ESTA CONFIGURAÇÃO DE SSL ✨
   * ===================================================================
   * Em produção (no servidor), tenta usar SSL.
   * Em desenvolvimento (sua máquina), desativa o SSL.
  */
  ssl: isProduction ? { rejectUnauthorized: false } : false,

});

module.exports = {
  query: (text, params) => pool.query(text, params),
};