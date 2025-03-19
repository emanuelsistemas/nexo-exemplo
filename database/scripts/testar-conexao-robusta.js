/**
 * Script para testar a conexão robusta com PostgreSQL
 * Este script verifica se a conexão está funcionando corretamente
 * usando o módulo de conexão robusta otimizada.
 */

// Importar o módulo de conexão robusta otimizada
const db = require('./conexao-robusta-otimizada');

async function testarConexao() {
  try {
    console.log('🔍 Testando conexão robusta com PostgreSQL...');
    
    // Inicializar a conexão
    await db.inicializar();
    
    // Obter informações de conexão
    const infoConexao = await db.executarQuery('SELECT current_database() as db, current_user as usuario, inet_server_addr() as servidor, inet_server_port() as porta');
    const info = infoConexao.rows[0];
    
    console.log(`\n🔌 Conexão estabelecida!`);
    console.log(`📡 Servidor: ${info.servidor}`);
    console.log(`🔢 Porta: ${info.porta}`);
    console.log(`📊 Database: ${info.db}`);
    console.log(`👤 Usuário: ${info.usuario}`);
    
    // Verificar versão do PostgreSQL
    const versao = await db.executarQuery('SELECT version()');
    console.log(`\n🔄 Versão do PostgreSQL:`);
    console.log(versao.rows[0].version);
    
    // Verificar tabelas disponíveis
    const tabelas = await db.executarQuery(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`\n📋 Tabelas disponíveis: ${tabelas.rows.length}`);
    console.table(tabelas.rows);
    
    // Verificar usuários
    const usuariosQry = await db.executarQuery(`
      SELECT COUNT(*) as total FROM cad_emp_user
    `);
    
    const usuariosTotal = usuariosQry.rows[0].total;
    console.log(`\n👥 Total de usuários: ${usuariosTotal}`);
    
    if (usuariosTotal > 0) {
      // Mostrar estatísticas
      console.log('\n📊 Estatísticas do Drive Vale-Sis:');
      
      // Usuários por perfil
      const usuariosPorPerfil = await db.executarQuery(`
        SELECT p.tipo, COUNT(*) as total
        FROM cad_emp_user u
        JOIN perfil_acesso p ON u.perfil_id = p.id
        GROUP BY p.tipo
        ORDER BY total DESC
      `);
      console.log('\n👥 Usuários por perfil:');
      console.table(usuariosPorPerfil.rows);
      
      // Arquivos por categoria
      const arquivosPorCategoria = await db.executarQuery(`
        SELECT c.nome as categoria, COUNT(*) as total_arquivos
        FROM metadados_arquivos a
        JOIN categorias_arquivos c ON a.categoria_id = c.id
        GROUP BY c.nome
        ORDER BY total_arquivos DESC
      `);
      console.log('\n📁 Arquivos por categoria:');
      console.table(arquivosPorCategoria.rows);
      
      // Compartilhamentos
      const totalCompartilhamentos = await db.executarQuery(`
        SELECT COUNT(*) as total FROM compartilhamento_arquivos WHERE ativo = TRUE
      `);
      console.log(`\n🔄 Total de compartilhamentos ativos: ${totalCompartilhamentos.rows[0].total}`);
    }
    
    console.log('\n✅ Teste de conexão concluído com sucesso!');
    
  } catch (erro) {
    console.error('\n❌ Erro ao testar conexão:', erro);
  } finally {
    // Fechar a conexão
    await db.fechar();
    console.log('\n👋 Conexão encerrada');
  }
}

// Executar o teste
testarConexao();
