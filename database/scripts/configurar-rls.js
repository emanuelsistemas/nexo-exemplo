/**
 * Script para configurar as políticas de Row Level Security (RLS) do Supabase
 * Este script configura as permissões de acesso às tabelas do Drive Vale-Sis
 */

const db = require('./gerenciar-banco');

async function configurarRLS() {
  try {
    console.log('Iniciando configuração de RLS para o Drive Vale-Sis...');
    
    // 1. Ativar RLS em todas as tabelas
    const tabelas = [
      'cad_emp_user',
      'perfil_acesso',
      'metadados_arquivos',
      'compartilhamento_arquivos',
      'categorias_arquivos'
    ];
    
    for (const tabela of tabelas) {
      console.log(`Ativando RLS na tabela ${tabela}...`);
      await db.executarQuery(`ALTER TABLE ${tabela} ENABLE ROW LEVEL SECURITY;`);
    }
    
    // 2. Remover políticas existentes para recriar
    console.log('Removendo políticas existentes...');
    for (const tabela of tabelas) {
      const politicas = await db.executarQuery(`
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = $1;
      `, [tabela]);
      
      for (const politica of politicas.rows) {
        await db.executarQuery(`DROP POLICY IF EXISTS ${politica.policyname} ON ${tabela};`);
      }
    }
    
    // 3. Configurar políticas para tabela cad_emp_user
    console.log('Configurando políticas para cad_emp_user...');
    
    // Política para SELECT: usuários comuns só veem seus próprios dados, admin vê todos
    await db.executarQuery(`
      CREATE POLICY user_select_own ON cad_emp_user
        FOR SELECT
        USING (auth.uid() = auth_id OR is_admin(auth.uid()));
    `);
    
    // Política para INSERT: usuários comuns só inserem seus próprios dados, admin insere para todos
    await db.executarQuery(`
      CREATE POLICY user_insert_own ON cad_emp_user
        FOR INSERT
        WITH CHECK (auth.uid() = auth_id OR is_admin(auth.uid()));
    `);
    
    // Política para UPDATE: usuários comuns só atualizam seus próprios dados, admin atualiza todos
    await db.executarQuery(`
      CREATE POLICY user_update_own ON cad_emp_user
        FOR UPDATE
        USING (auth.uid() = auth_id OR is_admin(auth.uid()));
    `);
    
    // Política para DELETE: apenas admin pode excluir
    await db.executarQuery(`
      CREATE POLICY admin_delete ON cad_emp_user
        FOR DELETE
        USING (is_admin(auth.uid()));
    `);
    
    // 4. Configurar políticas para tabela perfil_acesso
    console.log('Configurando políticas para perfil_acesso...');
    
    // Política para SELECT: todos podem ver
    await db.executarQuery(`
      CREATE POLICY all_select ON perfil_acesso
        FOR SELECT
        USING (true);
    `);
    
    // Política para INSERT/UPDATE/DELETE: apenas admin
    await db.executarQuery(`
      CREATE POLICY admin_insert ON perfil_acesso
        FOR INSERT
        WITH CHECK (is_admin(auth.uid()));
    `);
    
    await db.executarQuery(`
      CREATE POLICY admin_update ON perfil_acesso
        FOR UPDATE
        USING (is_admin(auth.uid()));
    `);
    
    await db.executarQuery(`
      CREATE POLICY admin_delete ON perfil_acesso
        FOR DELETE
        USING (is_admin(auth.uid()));
    `);
    
    // 5. Configurar políticas para tabela metadados_arquivos
    console.log('Configurando políticas para metadados_arquivos...');
    
    // Política para SELECT: usuários veem seus próprios arquivos ou os compartilhados com eles
    await db.executarQuery(`
      CREATE POLICY user_select_files ON metadados_arquivos
        FOR SELECT
        USING (
          /* Próprios arquivos */
          (SELECT auth_id FROM cad_emp_user WHERE id = usuario_id) = auth.uid() 
          /* Arquivos compartilhados */
          OR EXISTS (
            SELECT 1 FROM compartilhamento_arquivos
            WHERE arquivo_id = metadados_arquivos.id
            AND (SELECT auth_id FROM cad_emp_user WHERE id = usuario_destino_id) = auth.uid()
            AND ativo = true
          )
          /* Admin vê todos */
          OR is_admin(auth.uid())
          /* Arquivos públicos */
          OR publico = true
        );
    `);
    
    // Política para INSERT: usuários só inserem seus próprios arquivos
    await db.executarQuery(`
      CREATE POLICY user_insert_files ON metadados_arquivos
        FOR INSERT
        WITH CHECK (
          (SELECT auth_id FROM cad_emp_user WHERE id = usuario_id) = auth.uid()
          OR is_admin(auth.uid())
        );
    `);
    
    // Política para UPDATE: usuários só atualizam seus próprios arquivos ou compartilhados com permissão
    await db.executarQuery(`
      CREATE POLICY user_update_files ON metadados_arquivos
        FOR UPDATE
        USING (
          (SELECT auth_id FROM cad_emp_user WHERE id = usuario_id) = auth.uid()
          OR EXISTS (
            SELECT 1 FROM compartilhamento_arquivos
            WHERE arquivo_id = metadados_arquivos.id
            AND (SELECT auth_id FROM cad_emp_user WHERE id = usuario_destino_id) = auth.uid()
            AND permissao = 'edicao'
            AND ativo = true
          )
          OR is_admin(auth.uid())
        );
    `);
    
    // Política para DELETE: apenas donos e admin podem excluir (exclusão lógica)
    await db.executarQuery(`
      CREATE POLICY user_delete_files ON metadados_arquivos
        FOR UPDATE
        USING (
          (
            (SELECT auth_id FROM cad_emp_user WHERE id = usuario_id) = auth.uid()
            OR is_admin(auth.uid())
          )
          AND excluido = true
        );
    `);
    
    // 6. Configurar políticas para tabela compartilhamento_arquivos
    console.log('Configurando políticas para compartilhamento_arquivos...');
    
    // Política para SELECT: usuários veem compartilhamentos onde são origem ou destino
    await db.executarQuery(`
      CREATE POLICY user_select_share ON compartilhamento_arquivos
        FOR SELECT
        USING (
          (SELECT auth_id FROM cad_emp_user WHERE id = usuario_origem_id) = auth.uid()
          OR (SELECT auth_id FROM cad_emp_user WHERE id = usuario_destino_id) = auth.uid()
          OR is_admin(auth.uid())
        );
    `);
    
    // Política para INSERT: usuários só compartilham seus próprios arquivos
    await db.executarQuery(`
      CREATE POLICY user_insert_share ON compartilhamento_arquivos
        FOR INSERT
        WITH CHECK (
          (
            SELECT auth_id 
            FROM cad_emp_user 
            WHERE id = (
              SELECT usuario_id 
              FROM metadados_arquivos 
              WHERE id = arquivo_id
            )
          ) = auth.uid()
          OR is_admin(auth.uid())
        );
    `);
    
    // Política para UPDATE/DELETE: apenas o dono do compartilhamento ou admin pode modificar
    await db.executarQuery(`
      CREATE POLICY user_update_share ON compartilhamento_arquivos
        FOR UPDATE
        USING (
          (SELECT auth_id FROM cad_emp_user WHERE id = usuario_origem_id) = auth.uid()
          OR is_admin(auth.uid())
        );
    `);
    
    await db.executarQuery(`
      CREATE POLICY user_delete_share ON compartilhamento_arquivos
        FOR DELETE
        USING (
          (SELECT auth_id FROM cad_emp_user WHERE id = usuario_origem_id) = auth.uid()
          OR is_admin(auth.uid())
        );
    `);
    
    // 7. Configurar políticas para tabela categorias_arquivos
    console.log('Configurando políticas para categorias_arquivos...');
    
    // Política para SELECT: todos podem ver
    await db.executarQuery(`
      CREATE POLICY all_select_categories ON categorias_arquivos
        FOR SELECT
        USING (true);
    `);
    
    // Política para INSERT/UPDATE/DELETE: apenas admin
    await db.executarQuery(`
      CREATE POLICY admin_manage_categories ON categorias_arquivos
        FOR ALL
        USING (is_admin(auth.uid()));
    `);
    
    console.log('Configuração de RLS concluída com sucesso!');
    
  } catch (erro) {
    console.error('Erro ao configurar RLS:', erro);
  } finally {
    await db.fecharConexoes();
  }
}

// Executar a configuração do RLS
// configurarRLS();
