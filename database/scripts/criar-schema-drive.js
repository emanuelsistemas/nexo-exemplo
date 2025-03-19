/**
 * Script para criar o schema do Drive Vale-Sis
 * Este script configura as tabelas principais do sistema
 * Versão modificada para usar a conexão robusta otimizada
 */

// Usar o módulo de conexão robusta otimizada
const db = require('./conexao-robusta-otimizada');

async function criarSchemaDrive() {
  try {
    console.log(' Iniciando criação do schema do Drive Vale-Sis...');
    
    // Inicializar a conexão
    await db.inicializar();
    
    // 1. Criar tabela de perfil de acesso
    console.log('Criando tabela perfil_acesso...');
    await db.executarQuery(`
      CREATE TABLE IF NOT EXISTS perfil_acesso (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('admin', 'user')),
        descricao TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 2. Criar tabela de usuários
    console.log('Criando tabela cad_emp_user...');
    await db.executarQuery(`
      CREATE TABLE IF NOT EXISTS cad_emp_user (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        auth_id UUID,
        nome TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        telefone TEXT,
        empresa TEXT,
        cargo TEXT,
        perfil_id UUID REFERENCES perfil_acesso(id),
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 3. Criar tabela de categorias de arquivos
    console.log('Criando tabela categorias_arquivos...');
    await db.executarQuery(`
      CREATE TABLE IF NOT EXISTS categorias_arquivos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome TEXT NOT NULL,
        descricao TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 4. Criar tabela de metadados de arquivos
    console.log('Criando tabela metadados_arquivos...');
    await db.executarQuery(`
      CREATE TABLE IF NOT EXISTS metadados_arquivos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome_arquivo TEXT NOT NULL,
        tamanho BIGINT NOT NULL,
        tipo_mime TEXT NOT NULL,
        bucket_path TEXT NOT NULL,
        hash_conteudo TEXT,
        categoria_id UUID REFERENCES categorias_arquivos(id),
        usuario_id UUID REFERENCES cad_emp_user(id),
        compartilhavel BOOLEAN DEFAULT false,
        publico BOOLEAN DEFAULT false,
        excluido BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 5. Criar tabela de compartilhamento de arquivos
    console.log('Criando tabela compartilhamento_arquivos...');
    await db.executarQuery(`
      CREATE TABLE IF NOT EXISTS compartilhamento_arquivos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        arquivo_id UUID REFERENCES metadados_arquivos(id),
        usuario_origem_id UUID REFERENCES cad_emp_user(id),
        usuario_destino_id UUID REFERENCES cad_emp_user(id),
        permissao VARCHAR(50) CHECK (permissao IN ('leitura', 'edicao')),
        data_expiracao TIMESTAMP WITH TIME ZONE,
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 6. Criar função para verificar se um usuário é admin
    console.log('Criando função is_admin...');
    await db.executarQuery(`
      CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
      RETURNS BOOLEAN
      LANGUAGE plpgsql
      AS $$
      DECLARE
        is_admin_user BOOLEAN;
      BEGIN
        SELECT EXISTS (
          SELECT 1
          FROM cad_emp_user u
          JOIN perfil_acesso p ON u.perfil_id = p.id
          WHERE u.id = user_id AND p.tipo = 'admin'
        ) INTO is_admin_user;
        
        RETURN is_admin_user;
      END;
      $$;
    `);
    
    // 7. Configurar políticas RLS (Row Level Security)
    console.log('Configurando políticas de segurança (RLS)...');
    
    // Habilitar RLS nas tabelas
    await db.executarQuery('ALTER TABLE cad_emp_user ENABLE ROW LEVEL SECURITY;');
    await db.executarQuery('ALTER TABLE perfil_acesso ENABLE ROW LEVEL SECURITY;');
    await db.executarQuery('ALTER TABLE metadados_arquivos ENABLE ROW LEVEL SECURITY;');
    await db.executarQuery('ALTER TABLE compartilhamento_arquivos ENABLE ROW LEVEL SECURITY;');
    
    // Política para usuários (usuários comuns só veem seus próprios dados)
    await db.executarQuery(`
      CREATE POLICY user_select_own ON cad_emp_user
        FOR SELECT
        USING (auth.uid() = auth_id OR is_admin(auth.uid()));
    `);
    
    // Política para arquivos (usuários veem seus próprios arquivos)
    await db.executarQuery(`
      CREATE POLICY user_select_own_files ON metadados_arquivos
        FOR SELECT
        USING ((SELECT auth_id FROM cad_emp_user WHERE id = usuario_id) = auth.uid() 
              OR EXISTS (
                SELECT 1 FROM compartilhamento_arquivos
                WHERE arquivo_id = metadados_arquivos.id
                AND (SELECT auth_id FROM cad_emp_user WHERE id = usuario_destino_id) = auth.uid()
                AND ativo = true
              )
              OR is_admin(auth.uid())
              OR publico = true);
    `);
    
    console.log('Schema do Drive Vale-Sis criado com sucesso!');
    
    // 8. Inserir perfis padrão se não existirem
    const perfilAdminExiste = await db.executarQuery(
      'SELECT EXISTS(SELECT 1 FROM perfil_acesso WHERE tipo = $1)', 
      ['admin']
    );
    
    if (!perfilAdminExiste.rows[0].exists) {
      console.log('Inserindo perfil admin padrão...');
      await db.executarQuery(
        'INSERT INTO perfil_acesso (tipo, descricao) VALUES ($1, $2)',
        ['admin', 'Administrador com acesso total ao sistema']
      );
    }
    
    const perfilUserExiste = await db.executarQuery(
      'SELECT EXISTS(SELECT 1 FROM perfil_acesso WHERE tipo = $1)', 
      ['user']
    );
    
    if (!perfilUserExiste.rows[0].exists) {
      console.log('Inserindo perfil user padrão...');
      await db.executarQuery(
        'INSERT INTO perfil_acesso (tipo, descricao) VALUES ($1, $2)',
        ['user', 'Usuário comum com acesso restrito']
      );
    }
    
    console.log('Configuração completa do banco de dados finalizada!');
    
  } catch (erro) {
    console.error('Erro ao criar schema:', erro);
  } finally {
    // Fechar conexão ao terminar
    await db.fechar();
  }
}

// Executar a criação do schema
criarSchemaDrive();
