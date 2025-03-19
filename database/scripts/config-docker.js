/**
 * Configuração centralizada para conexão com PostgreSQL
 * Usando nomes de host do Docker em vez de IPs fixos
 */

// Configuração do PostgreSQL
const postgres = {
  // Usando o nome do container Docker
  host: 'drive-vale-sis_supabase-db-1',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'your-super-secret-and-long-postgres-password',
  ssl: false
};

// Configuração de fallback (usando IP como fallback)
const postgresFallback = {
  host: '172.19.0.4',  // IP de fallback
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'your-super-secret-and-long-postgres-password',
  ssl: false
};

// Variáveis de ambiente do Supabase
const supabase = {
  url: 'http://172.19.0.13:8000',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q'
};

// Funções auxiliares - Tenta conectar primeiro com o nome do host, depois com IP
const obterConfiguracaoDb = async () => {
  try {
    const { Pool } = require('pg');
    try {
      // Primeiro tenta com o nome do host Docker
      const pool = new Pool(postgres);
      const client = await pool.connect();
      client.release();
      await pool.end();
      console.log('Usando conexão via nome do container Docker');
      return postgres;
    } catch (erro) {
      // Se falhar, tenta com o IP
      console.log(`Falha ao conectar via nome do container: ${erro.message}`);
      console.log('Tentando conexão via IP de fallback');
      
      const pool = new Pool(postgresFallback);
      const client = await pool.connect();
      client.release();
      await pool.end();
      return postgresFallback;
    }
  } catch (erro) {
    console.error('Erro em ambas as tentativas de conexão:', erro.message);
    throw new Error('Não foi possível estabelecer conexão com o banco de dados');
  }
};

// Comandos PSQL úteis para administração
const comandosAdmin = {
  listarTabelas: '\\dt',
  descreverTabela: nome => `\\d ${nome}`,
  criarBanco: nome => `CREATE DATABASE ${nome};`,
  excluirBanco: nome => `DROP DATABASE ${nome};`,
  backup: (arquivo, tabela) => `pg_dump -h ${postgres.host} -p ${postgres.port} -U ${postgres.user} -d ${postgres.database} ${tabela ? '-t ' + tabela : ''} -f ${arquivo}`
};

module.exports = {
  postgres,
  postgresFallback,
  supabase,
  comandosAdmin,
  obterConfiguracaoDb
};
