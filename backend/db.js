/*
 * ==========================================================================
 * FICHEIRO: backend/db.js (VERSÃO PARA DEPLOY)
 * ==========================================================================
 * - Remove dados de conexão fixos (hardcoded).
 * - Configurado para ler a URL do banco de dados a partir de uma
 * variável de ambiente (process.env.DATABASE_URL).
 * - Adicionada configuração SSL necessária para a nuvem.
 * - Usa o pacote 'dotenv' para permitir o desenvolvimento local com um .env.
 */

const { Pool } = require('pg');
require('dotenv').config(); // Carrega as variáveis do arquivo .env

// A configuração da pool agora é feita através da connectionString.
// Em produção (Render), a DATABASE_URL será fornecida pelo ambiente.
// Em desenvolvimento (local), ela será lida do seu arquivo .env.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};