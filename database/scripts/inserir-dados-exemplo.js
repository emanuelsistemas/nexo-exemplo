/**
 * Script para inserir dados de exemplo no Drive Vale-Sis
 * Este script insere usuários, categorias e arquivos de exemplo
 */

// Usar o módulo de conexão robusta otimizada
const db = require('./conexao-robusta-otimizada');
const { v4: uuidv4 } = require('uuid');

async function inserirDadosExemplo() {
  try {
    console.log('🚀 Iniciando inserção de dados de exemplo...');
    
    // Inicializar a conexão
    await db.inicializar();
    
    // Usar transação para garantir atomicidade
    await db.executarTransacao(async (client) => {
      console.log('\n👥 Inserindo usuários de exemplo...');
      
      // 1. Pegar os IDs dos perfis
      const perfilQuery = await client.query('SELECT id, tipo FROM perfil_acesso');
      if (perfilQuery.rows.length === 0) {
        throw new Error('Perfis não encontrados. Execute primeiro o script criar-schema-drive.js');
      }
      
      const perfis = perfilQuery.rows.reduce((acc, perfil) => {
        acc[perfil.tipo] = perfil.id;
        return acc;
      }, {});
      
      // 2. Inserir usuários
      const usuariosExemplo = [
        {
          nome: 'Administrador',
          email: 'admin@valesoft.com.br',
          telefone: '(12) 3456-7890',
          empresa: 'Vale Software',
          cargo: 'Administrador de Sistemas',
          perfilId: perfis.admin,
          authId: uuidv4()
        },
        {
          nome: 'João Silva',
          email: 'joao.silva@empresa.com.br',
          telefone: '(11) 91234-5678',
          empresa: 'Empresa ABC',
          cargo: 'Analista',
          perfilId: perfis.user,
          authId: uuidv4()
        },
        {
          nome: 'Maria Souza',
          email: 'maria.souza@consultoria.com',
          telefone: '(21) 98765-4321',
          empresa: 'Consultoria XYZ',
          cargo: 'Consultora',
          perfilId: perfis.user,
          authId: uuidv4()
        }
      ];
      
      // Armazenar IDs dos usuários inseridos
      const usuariosIds = {};
      
      for (const usuario of usuariosExemplo) {
        const resultado = await client.query(`
          INSERT INTO cad_emp_user (nome, email, telefone, empresa, cargo, perfil_id, auth_id, ativo)
          VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
          ON CONFLICT (email) DO UPDATE SET
            nome = EXCLUDED.nome,
            telefone = EXCLUDED.telefone,
            empresa = EXCLUDED.empresa,
            cargo = EXCLUDED.cargo,
            updated_at = CURRENT_TIMESTAMP
          RETURNING id, nome
        `, [
          usuario.nome,
          usuario.email,
          usuario.telefone,
          usuario.empresa,
          usuario.cargo,
          usuario.perfilId,
          usuario.authId
        ]);
        
        usuariosIds[usuario.email] = resultado.rows[0].id;
        console.log(`✅ Usuário inserido/atualizado: ${resultado.rows[0].nome}`);
      }
      
      // 3. Inserir categorias de arquivos
      console.log('\n📂 Inserindo categorias de arquivos...');
      
      const categoriasExemplo = [
        { nome: 'Documentos', descricao: 'Documentos gerais como PDFs, DOCs, etc.' },
        { nome: 'Imagens', descricao: 'Arquivos de imagem como JPG, PNG, etc.' },
        { nome: 'Planilhas', descricao: 'Planilhas de dados como XLSX, CSV, etc.' },
        { nome: 'Projetos', descricao: 'Arquivos de projetos internos' }
      ];
      
      // Armazenar IDs das categorias inseridas
      const categoriasIds = {};
      
      for (const categoria of categoriasExemplo) {
        // Verificar se a categoria já existe
        const categoriaExistente = await client.query(
          'SELECT id FROM categorias_arquivos WHERE nome = $1',
          [categoria.nome]
        );
        
        let categoriaId;
        
        if (categoriaExistente.rows.length > 0) {
          // Atualizar categoria existente
          categoriaId = categoriaExistente.rows[0].id;
          await client.query(
            'UPDATE categorias_arquivos SET descricao = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [categoria.descricao, categoriaId]
          );
          console.log(`✅ Categoria atualizada: ${categoria.nome}`);
        } else {
          // Inserir nova categoria
          const resultado = await client.query(
            'INSERT INTO categorias_arquivos (nome, descricao) VALUES ($1, $2) RETURNING id',
            [categoria.nome, categoria.descricao]
          );
          categoriaId = resultado.rows[0].id;
          console.log(`✅ Categoria inserida: ${categoria.nome}`);
        }
        
        categoriasIds[categoria.nome] = categoriaId;
      }
      
      // 4. Inserir metadados de arquivos fictícios
      console.log('\n📄 Inserindo metadados de arquivos...');
      
      const arquivosExemplo = [
        {
          nome_arquivo: 'Relatório 2025.pdf',
          tamanho: Math.floor(1024 * 1024 * 2.5), // 2.5 MB (arredondado para inteiro)
          tipo_mime: 'application/pdf',
          bucket_path: 'documentos/relatorio-2025.pdf',
          categoria: 'Documentos',
          usuario_email: 'admin@valesoft.com.br',
          compartilhavel: true,
          publico: false
        },
        {
          nome_arquivo: 'Logo Vale-Sis.png',
          tamanho: Math.floor(1024 * 512), // 512 KB (arredondado para inteiro)
          tipo_mime: 'image/png',
          bucket_path: 'imagens/logo-vale-sis.png',
          categoria: 'Imagens',
          usuario_email: 'admin@valesoft.com.br',
          compartilhavel: true,
          publico: true
        },
        {
          nome_arquivo: 'Orçamento 2025.xlsx',
          tamanho: Math.floor(1024 * 1024 * 1.2), // 1.2 MB (arredondado para inteiro)
          tipo_mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          bucket_path: 'planilhas/orcamento-2025.xlsx',
          categoria: 'Planilhas',
          usuario_email: 'joao.silva@empresa.com.br',
          compartilhavel: true,
          publico: false
        }
      ];
      
      // Armazenar IDs dos arquivos inseridos
      const arquivosIds = [];
      
      for (const arquivo of arquivosExemplo) {
        const resultado = await client.query(`
          INSERT INTO metadados_arquivos (
            nome_arquivo, tamanho, tipo_mime, bucket_path, 
            categoria_id, usuario_id, compartilhavel, publico
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id, nome_arquivo
        `, [
          arquivo.nome_arquivo,
          arquivo.tamanho,
          arquivo.tipo_mime,
          arquivo.bucket_path,
          categoriasIds[arquivo.categoria],
          usuariosIds[arquivo.usuario_email],
          arquivo.compartilhavel,
          arquivo.publico
        ]);
        
        arquivosIds.push(resultado.rows[0].id);
        console.log(`✅ Arquivo inserido: ${resultado.rows[0].nome_arquivo}`);
      }
      
      // 5. Configurar compartilhamentos de exemplo
      console.log('\n🔄 Configurando compartilhamentos...');
      
      // Verificar se já existe um compartilhamento
      const compartilhamentoExistente = await client.query(`
        SELECT id FROM compartilhamento_arquivos 
        WHERE arquivo_id = $1 
          AND usuario_origem_id = $2
          AND usuario_destino_id = $3
      `, [
        arquivosIds[2], // Orçamento 2025.xlsx
        usuariosIds['joao.silva@empresa.com.br'],
        usuariosIds['maria.souza@consultoria.com']
      ]);
      
      if (compartilhamentoExistente.rows.length > 0) {
        // Atualizar compartilhamento existente
        await client.query(`
          UPDATE compartilhamento_arquivos 
          SET permissao = $1, ativo = TRUE, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [
          'leitura',
          compartilhamentoExistente.rows[0].id
        ]);
        console.log('✅ Compartilhamento atualizado: João -> Maria');
      } else {
        // Inserir novo compartilhamento
        await client.query(`
          INSERT INTO compartilhamento_arquivos (
            arquivo_id, usuario_origem_id, usuario_destino_id, permissao, ativo
          )
          VALUES ($1, $2, $3, $4, TRUE)
        `, [
          arquivosIds[2], // Orçamento 2025.xlsx
          usuariosIds['joao.silva@empresa.com.br'],
          usuariosIds['maria.souza@consultoria.com'],
          'leitura'
        ]);
        console.log('✅ Compartilhamento criado: João -> Maria');
      }
    });
    
    console.log('\n📝 Verificando dados inseridos...');
    
    // Mostrar usuários
    const usuarios = await db.executarQuery(`
      SELECT u.nome, u.email, u.cargo, p.tipo as perfil
      FROM cad_emp_user u
      JOIN perfil_acesso p ON u.perfil_id = p.id
      ORDER BY u.nome
    `);
    
    console.log('\n👥 Usuários:');
    console.table(usuarios.rows);
    
    // Mostrar arquivos
    const arquivos = await db.executarQuery(`
      SELECT 
        a.nome_arquivo, 
        a.tamanho/1024/1024 as tamanho_mb, 
        a.publico, 
        c.nome as categoria,
        u.nome as proprietario
      FROM metadados_arquivos a
      JOIN categorias_arquivos c ON a.categoria_id = c.id
      JOIN cad_emp_user u ON a.usuario_id = u.id
      ORDER BY a.nome_arquivo
    `);
    
    console.log('\n📄 Arquivos:');
    console.table(arquivos.rows);
    
    // Mostrar compartilhamentos
    const compartilhamentos = await db.executarQuery(`
      SELECT 
        a.nome_arquivo,
        uo.nome as origem,
        ud.nome as destino,
        c.permissao
      FROM compartilhamento_arquivos c
      JOIN metadados_arquivos a ON c.arquivo_id = a.id
      JOIN cad_emp_user uo ON c.usuario_origem_id = uo.id
      JOIN cad_emp_user ud ON c.usuario_destino_id = ud.id
      WHERE c.ativo = TRUE
    `);
    
    console.log('\n🔄 Compartilhamentos:');
    console.table(compartilhamentos.rows);
    
    console.log('\n✅ Dados de exemplo inseridos com sucesso!');
    
  } catch (erro) {
    console.error('\n❌ Erro ao inserir dados:', erro);
  } finally {
    // Fechar conexão ao terminar
    await db.fechar();
  }
}

// Verificar se uuid está disponível
try {
  require('uuid');
} catch (error) {
  console.error('❌ Módulo uuid não encontrado. Instalando...');
  console.log('Instale manualmente com: npm install uuid');
  process.exit(1);
}

// Executar a inserção de dados
inserirDadosExemplo();
