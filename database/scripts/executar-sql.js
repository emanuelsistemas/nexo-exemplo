/**
 * Função para executar comandos SQL no PostgreSQL
 * Permite criar tabelas e executar outros comandos SQL
 */

const { Pool } = require('pg');

// Configuração da conexão com o PostgreSQL
const pool = new Pool({
  host: 'db.hbgmyrooyrisunhczfna.supabase.co', // ou o host do seu PostgreSQL
  port: 5432,
  database: 'postgres', // nome do banco
  user: 'postgres', // usuário
  password: 'XDJ8cnWtyyiU@YScB2-j', // senha
  ssl: {
    rejectUnauthorized: false // necessário para conexões Supabase
  }
});

/**
 * Executa um comando SQL no PostgreSQL
 * @param {string} sqlQuery - Comando SQL a ser executado
 * @returns {Promise} - Promise com o resultado da execução
 */
async function executarSQL(sqlQuery) {
  const client = await pool.connect();
  
  try {
    console.log('Executando query:', sqlQuery);
    const result = await client.query(sqlQuery);
    console.log('Resultado:', result);
    return result;
  } catch (error) {
    console.error('Erro ao executar SQL:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Cria uma tabela de teste no PostgreSQL
 */
async function criarTabelaTeste() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS tabela_teste (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(100) NOT NULL,
      descricao TEXT,
      data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  try {
    await executarSQL(createTableSQL);
    console.log('Tabela de teste criada com sucesso!');
    
    // Inserir um registro de teste
    const insertSQL = `
      INSERT INTO tabela_teste (nome, descricao)
      VALUES ('Teste', 'Registro de teste criado via JavaScript')
      RETURNING *;
    `;
    
    const resultado = await executarSQL(insertSQL);
    console.log('Registro inserido:', resultado.rows[0]);
  } catch (error) {
    console.error('Falha ao criar tabela de teste:', error);
  }
}

// Executar a função de criação da tabela
criarTabelaTeste()
  .then(() => console.log('Processo concluído'))
  .catch(err => console.error('Erro no processo:', err))
  .finally(() => pool.end()); // Encerra o pool de conexões quando terminar

module.exports = { executarSQL };
