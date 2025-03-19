/**
 * Exemplo de uso do novo sistema de configuração robusto
 * que tenta se conectar usando hostname, com fallback para IP
 */

const config = require('./config');
const { Pool } = require('pg');

async function demonstracaoConexaoRobusta() {
  console.log('🚀 Demonstração de conexão robusta ao PostgreSQL');
  console.log('------------------------------------------------');
  
  try {
    // Obter a melhor configuração de conexão disponível (hostname ou IP)
    console.log('⏳ Obtendo a melhor configuração de conexão...');
    const configDb = await config.obterConfiguracaoDb();
    console.log(`✅ Usando host: ${configDb.host}`);
    
    // Criar pool de conexão com a configuração obtida
    const pool = new Pool(configDb);
    const client = await pool.connect();
    console.log('✅ Conectado ao banco de dados!');
    
    // Consultar algumas informações
    const info = await client.query(`
      SELECT 
        current_database() as banco,
        current_user as usuario,
        current_timestamp as data_hora,
        version() as versao
    `);
    
    console.log('\n📊 Informações do banco de dados:');
    console.table(info.rows[0]);
    
    // Listar tabelas
    const tabelas = await client.query(`
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    console.log('\n📋 Tabelas disponíveis:');
    const nomeTabelas = tabelas.rows.map(t => t.tablename);
    console.table(nomeTabelas);
    
    // Exemplo de consulta em uma tabela
    if (nomeTabelas.includes('teste2')) {
      const dados = await client.query('SELECT * FROM teste2');
      console.log('\n📄 Dados da tabela teste2:');
      console.table(dados.rows);
    }
    
    // Limpar conexões
    client.release();
    await pool.end();
    console.log('\n👋 Desconectado do banco de dados');
    
  } catch (erro) {
    console.error(`❌ Erro: ${erro.message}`);
  }
}

// Executar demonstração
demonstracaoConexaoRobusta();

/**
 * Esta abordagem é muito mais robusta porque:
 * 
 * 1. Tenta primeiro conectar usando um nome de host, que não muda mesmo que o IP mude
 * 2. Se o nome de host falhar, tenta com o IP conhecido
 * 3. Pode ser facilmente adaptada para ler de variáveis de ambiente
 * 4. Centraliza a lógica de conexão em um único local
 * 5. Fornece diagnóstico claro sobre qual método de conexão está sendo usado
 * 
 * Para ambientes de produção, recomenda-se evoluir este modelo para:
 * - Ler credenciais de variáveis de ambiente
 * - Implementar retry com backoff exponencial
 * - Adicionar pool de conexões com limites adequados
 * - Implementar logging estruturado
 */
