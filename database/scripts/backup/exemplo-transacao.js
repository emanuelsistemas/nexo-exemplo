/**
 * Exemplo de uso de transações para operações complexas no Drive Vale-Sis
 * Este exemplo demonstra como usar transações para garantir a integridade dos dados
 * ao realizar múltiplas operações relacionadas.
 */

// Importar o módulo de conexão otimizada
const db = require('./conexao-robusta-otimizada');
const path = require('path');
const fs = require('fs');

// Copiar o arquivo de conexão robusta otimizada se não existir
const sourceFile = '/root/Cline/MCP/supabase-mcp-server/conexao-robusta-otimizada.js';
const targetFile = path.join(__dirname, 'conexao-robusta-otimizada.js');

if (!fs.existsSync(targetFile) && fs.existsSync(sourceFile)) {
  fs.copyFileSync(sourceFile, targetFile);
  console.log(`Arquivo de conexão copiado para ${targetFile}`);
}

/**
 * Exemplo: Registro de um novo usuário com perfil
 * - Verifica se o email já existe
 * - Cria o usuário
 * - Atribui o perfil padrão
 * - Tudo em uma única transação atômica
 */
async function registrarNovoUsuario(nome, email, telefone, empresa, cargo) {
  try {
    // Inicializar a conexão
    await db.inicializar();
    
    // Usar transação para garantir que todas as operações sejam atômicas
    const resultado = await db.executarTransacao(async (client) => {
      // 1. Verificar se o email já existe
      const verificarEmail = await client.query(
        'SELECT COUNT(*) as total FROM cad_emp_user WHERE email = $1',
        [email]
      );
      
      if (parseInt(verificarEmail.rows[0].total) > 0) {
        throw new Error(`O email ${email} já está cadastrado`);
      }
      
      // 2. Obter o ID do perfil padrão (tipo 'user')
      const perfilQuery = await client.query(
        'SELECT id FROM perfil_acesso WHERE tipo = $1',
        ['user']
      );
      
      if (perfilQuery.rows.length === 0) {
        throw new Error('Perfil padrão "user" não encontrado');
      }
      
      const perfilId = perfilQuery.rows[0].id;
      
      // 3. Inserir o novo usuário
      const novoUsuario = await client.query(`
        INSERT INTO cad_emp_user (nome, email, telefone, empresa, cargo, perfil_id, ativo)
        VALUES ($1, $2, $3, $4, $5, $6, TRUE)
        RETURNING *
      `, [nome, email, telefone, empresa, cargo, perfilId]);
      
      // 4. Simular registro de log de auditoria (para exemplo)
      await client.query(`
        CREATE TABLE IF NOT EXISTS log_auditoria (
          id SERIAL PRIMARY KEY,
          operacao TEXT NOT NULL,
          tabela TEXT NOT NULL,
          usuario_id UUID,
          dados JSONB,
          data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await client.query(`
        INSERT INTO log_auditoria (operacao, tabela, usuario_id, dados)
        VALUES ($1, $2, $3, $4)
      `, [
        'INSERIR', 
        'cad_emp_user', 
        novoUsuario.rows[0].id,
        JSON.stringify({
          nome: nome,
          email: email,
          perfil: 'user'
        })
      ]);
      
      return novoUsuario.rows[0];
    });
    
    return resultado;
  } catch (erro) {
    console.error('❌ Erro ao registrar usuário:', erro.message);
    throw erro;
  }
}

/**
 * Exemplo: Compartilhar múltiplos arquivos com um usuário
 * - Verifica se os arquivos existem
 * - Verifica se o usuário existe
 * - Cria os registros de compartilhamento
 * - Tudo em uma única transação
 */
async function compartilharArquivos(usuarioOrigemId, usuarioDestinoId, arquivoIds, permissao = 'leitura') {
  try {
    // Inicializar a conexão
    await db.inicializar();
    
    // Usar transação
    const resultados = await db.executarTransacao(async (client) => {
      // 1. Verificar se o usuário origem existe
      const verificarOrigem = await client.query(
        'SELECT nome FROM cad_emp_user WHERE id = $1 AND ativo = TRUE',
        [usuarioOrigemId]
      );
      
      if (verificarOrigem.rows.length === 0) {
        throw new Error('Usuário de origem não encontrado ou inativo');
      }
      
      // 2. Verificar se o usuário destino existe
      const verificarDestino = await client.query(
        'SELECT nome FROM cad_emp_user WHERE id = $1 AND ativo = TRUE',
        [usuarioDestinoId]
      );
      
      if (verificarDestino.rows.length === 0) {
        throw new Error('Usuário de destino não encontrado ou inativo');
      }
      
      // 3. Verificar se todos os arquivos existem e pertencem ao usuário de origem
      for (const arquivoId of arquivoIds) {
        const verificarArquivo = await client.query(
          'SELECT nome_arquivo FROM metadados_arquivos WHERE id = $1 AND usuario_id = $2 AND excluido = FALSE',
          [arquivoId, usuarioOrigemId]
        );
        
        if (verificarArquivo.rows.length === 0) {
          throw new Error(`Arquivo ${arquivoId} não encontrado ou não pertence ao usuário de origem`);
        }
      }
      
      // 4. Criar compartilhamentos (ignorando se já existir)
      const compartilhamentos = [];
      
      for (const arquivoId of arquivoIds) {
        // Verificar se já existe um compartilhamento
        const verificarCompartilhamento = await client.query(
          `SELECT id FROM compartilhamento_arquivos 
           WHERE arquivo_id = $1 AND usuario_origem_id = $2 AND usuario_destino_id = $3`,
          [arquivoId, usuarioOrigemId, usuarioDestinoId]
        );
        
        // Se já existe, atualiza a permissão
        if (verificarCompartilhamento.rows.length > 0) {
          const id = verificarCompartilhamento.rows[0].id;
          await client.query(
            `UPDATE compartilhamento_arquivos
             SET permissao = $1, ativo = TRUE, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING *`,
            [permissao, id]
          );
          compartilhamentos.push(`Compartilhamento atualizado: ${arquivoId}`);
        } else {
          // Se não existe, cria um novo
          const novoCompartilhamento = await client.query(
            `INSERT INTO compartilhamento_arquivos 
             (arquivo_id, usuario_origem_id, usuario_destino_id, permissao, ativo)
             VALUES ($1, $2, $3, $4, TRUE)
             RETURNING id`,
            [arquivoId, usuarioOrigemId, usuarioDestinoId, permissao]
          );
          compartilhamentos.push(`Novo compartilhamento: ${arquivoId}`);
        }
      }
      
      return {
        usuarioOrigem: verificarOrigem.rows[0].nome,
        usuarioDestino: verificarDestino.rows[0].nome,
        totalArquivos: arquivoIds.length,
        compartilhamentos
      };
    });
    
    return resultados;
  } catch (erro) {
    console.error('❌ Erro ao compartilhar arquivos:', erro.message);
    throw erro;
  }
}

// Função para testar as operações
async function executarTestes() {
  try {
    console.log('🚀 Iniciando testes de transações com o Drive Vale-Sis');
    console.log('-----------------------------------------------------');
    
    // Ver informações da conexão
    await db.inicializar();
    console.log(`\n🔌 Conexão: ${db.getInfo().host}`);
    
    // Testes de tabelas
    console.log('\n🔍 Verificando tabelas necessárias...');
    
    // Detectar se as tabelas do Drive Vale-Sis existem
    const tabelas = await db.executarQuery(`
      SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cad_emp_user') as usuarios_existe,
             EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'perfil_acesso') as perfil_existe,
             EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'metadados_arquivos') as arquivos_existe,
             EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'compartilhamento_arquivos') as compartilhamento_existe
    `);
    
    console.table(tabelas.rows[0]);
    
    // Se as tabelas do Drive Vale-Sis existirem, testar uma consulta
    if (tabelas.rows[0].usuarios_existe) {
      console.log('\n👥 Consultando usuários:');
      const usuarios = await db.executarQuery('SELECT id, nome, email, cargo FROM cad_emp_user LIMIT 5');
      console.table(usuarios.rows);
    } else {
      console.log('\n⚠️ Tabelas do Drive Vale-Sis não detectadas. Este script requer que o schema do Drive Vale-Sis já esteja criado.');
      console.log('Você pode criar o schema usando: node criar-schema-drive.js');
    }
    
    // Fechar conexão
    await db.fechar();
    
  } catch (erro) {
    console.error('\n❌ Erro nos testes:', erro.message);
    await db.fechar();
  }
}

// Executar testes
executarTestes();
