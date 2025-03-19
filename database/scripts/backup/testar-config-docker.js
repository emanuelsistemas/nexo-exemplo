/**
 * Script para testar a nova configuração que usa nome de container Docker
 */

const config = require('./config-docker');
const { Pool } = require('pg');

async function testarConexaoComHostname() {
  console.log('🔄 Testando conexão com o PostgreSQL usando nome do container Docker...');
  
  try {
    // Obter configuração ideal (tenta primeiro com hostname, depois com IP)
    const configConexao = await config.obterConfiguracaoDb();
    console.log(`✅ Configuração obtida com sucesso! Usando host: ${configConexao.host}`);
    
    // Criar pool com a configuração obtida
    const pool = new Pool(configConexao);
    const client = await pool.connect();
    console.log('✅ Conectado ao banco de dados!');
    
    // Testar consulta
    const res = await client.query('SELECT current_database() as db, current_user as usuario, current_timestamp as hora_atual');
    console.log('📊 Informações da conexão:');
    console.table(res.rows[0]);
    
    // Listar tabelas
    const tabelas = await client.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename;");
    console.log('📋 Tabelas no banco de dados:');
    console.table(tabelas.rows.map(row => row.tablename));
    
    client.release();
    await pool.end();
    console.log('👋 Conexão encerrada com sucesso');
    
    return true;
  } catch (erro) {
    console.error('❌ Erro ao testar conexão:', erro.message);
    return false;
  }
}

// Verificar se o nome do container está disponível
const { exec } = require('child_process');

exec('getent hosts drive-vale-sis_supabase-db-1', (erro, stdout, stderr) => {
  if (erro) {
    console.log('⚠️ O nome do container não está disponível no sistema de hosts');
    console.log('🔍 Sugestão: Adicione uma entrada no arquivo /etc/hosts:');
    console.log('  172.19.0.4   drive-vale-sis_supabase-db-1');
  } else {
    console.log('✅ Nome do container disponível no sistema de hosts:');
    console.log(stdout);
  }
  
  // Executar o teste de qualquer forma
  testarConexaoComHostname()
    .then(sucesso => {
      if (sucesso) {
        console.log(`
✅ RECOMENDAÇÃO:
  Use o arquivo 'config-docker.js' para suas conexões com o banco de dados.
  Ele tenta primeiro se conectar usando o nome do container e, se falhar, usa o IP como fallback.
  Para uma solução mais robusta, adicione uma entrada no arquivo /etc/hosts:
  
  172.19.0.4   drive-vale-sis_supabase-db-1
  
  Isso garantirá que o nome do container seja sempre resolvido corretamente.
`);
      } else {
        console.log(`
⚠️ ALTERNATIVAS:
  1. Use variáveis de ambiente para configurar a conexão do banco
  2. Crie um arquivo .env para armazenar as configurações
  3. Se estiver usando Docker Compose, configure os serviços para usar o nome do serviço do PostgreSQL na mesma rede
`);
      }
    });
});
