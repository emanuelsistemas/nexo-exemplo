/**
 * Script para testar conexão com PostgreSQL e popular a tabela de teste
 */

const { Pool } = require('pg');

// Configuração da conexão com o PostgreSQL
const pool = new Pool({
  host: '172.19.0.4',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'your-super-secret-and-long-postgres-password',
  ssl: false
});

// Função para executar consultas
async function executarQuery(query, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result;
  } finally {
    client.release();
  }
}

// Função para popular a tabela com mais dados
async function popularTabelaTeste() {
  console.log('Populando tabela teste com dados...');
  
  // Array de nomes para inserir
  const nomes = [
    'João Silva', 
    'Maria Oliveira', 
    'Pedro Santos', 
    'Ana Pereira',
    'Carlos Ferreira',
    'Lucia Costa',
    'Bruno Martins',
    'Camila Souza',
    'Roberto Almeida',
    'Juliana Lima'
  ];
  
  try {
    // Inserir múltiplos registros
    for (const nome of nomes) {
      const query = 'INSERT INTO teste (nome) VALUES ($1) RETURNING *';
      const result = await executarQuery(query, [nome]);
      console.log(`Inserido: ${JSON.stringify(result.rows[0])}`);
    }
    
    // Consultar todos os registros
    const allRecords = await executarQuery('SELECT * FROM teste ORDER BY id');
    console.log('\nTodos os registros na tabela:');
    console.table(allRecords.rows);
    
    console.log(`\nTotal de registros: ${allRecords.rows.length}`);
  } catch (error) {
    console.error('Erro ao popular tabela:', error);
  } finally {
    // Encerrar pool de conexões
    await pool.end();
  }
}

// Testar conexão e então popular a tabela
async function main() {
  try {
    // Testar conexão
    const client = await pool.connect();
    console.log('✅ Conexão com o banco de dados bem sucedida!');
    
    // Verificar versão do PostgreSQL
    const versionResult = await client.query('SELECT version()');
    const version = versionResult.rows[0].version;
    console.log(`📊 Versão do PostgreSQL: ${version}`);
    
    client.release();
    
    // Popular tabela
    await popularTabelaTeste();
    
  } catch (error) {
    console.error('❌ Erro ao conectar:', error);
  }
}

// Executar função principal
main().catch(console.error);
