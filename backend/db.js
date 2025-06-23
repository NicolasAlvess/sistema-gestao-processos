/*
 * ==========================================================================
 * FICHEIRO: backend/db.js (VERSÃO FINAL E ROBUSTA)
 * ==========================================================================
 * - Configuração de SSL agora é condicional: só é ativada em ambiente
 * de produção (quando a URL do banco não for 'localhost').
 * - Isso permite que o mesmo código funcione tanto localmente quanto na nuvem.
 */

const { Pool } = require('pg');
require('dotenv').config();

const connectionConfig = {
  connectionString: process.env.DATABASE_URL,
};

// Adiciona a configuração de SSL apenas se não estivermos em um ambiente local.
// Verificamos se a URL do banco de dados NÃO contém 'localhost'.
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')) {
  connectionConfig.ssl = {
    rejectUnauthorized: false
  };
}

const pool = new Pool(connectionConfig);

module.exports = {
  query: (text, params) => pool.query(text, params),
};