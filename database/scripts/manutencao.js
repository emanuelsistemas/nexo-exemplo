/**
 * Script para manutenção do banco de dados PostgreSQL do Drive Vale-Sis
 * Este script fornece funções para backup, verificação de integridade e manutenção
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const config = require('./config');
const db = require('./gerenciar-banco');

const execPromise = promisify(exec);

// Classe para manutenção do banco de dados
class ManutencaoBanco {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups');
    
    // Criar diretório de backups se não existir
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }
  
  /**
   * Realiza backup do banco de dados
   * @returns {Promise<string>} - Caminho do arquivo de backup
   */
  async realizarBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(this.backupDir, `drive_vale_sis_${timestamp}.sql`);
    
    const command = `PGPASSWORD=${config.postgres.password} pg_dump -h ${config.postgres.host} -p ${config.postgres.port} -U ${config.postgres.user} -d ${config.postgres.database} -F p > "${backupFile}"`;
    
    console.log('Iniciando backup do banco de dados...');
    try {
      await execPromise(command);
      console.log(`Backup realizado com sucesso: ${backupFile}`);
      return backupFile;
    } catch (erro) {
      console.error('Erro ao realizar backup:', erro);
      throw erro;
    }
  }
  
  /**
   * Restaura um backup do banco de dados
   * @param {string} backupFile - Caminho do arquivo de backup
   * @returns {Promise<void>}
   */
  async restaurarBackup(backupFile) {
    if (!fs.existsSync(backupFile)) {
      throw new Error(`Arquivo de backup não encontrado: ${backupFile}`);
    }
    
    const command = `PGPASSWORD=${config.postgres.password} psql -h ${config.postgres.host} -p ${config.postgres.port} -U ${config.postgres.user} -d ${config.postgres.database} -f "${backupFile}"`;
    
    console.log(`Iniciando restauração do backup: ${backupFile}...`);
    try {
      await execPromise(command);
      console.log('Restauração concluída com sucesso!');
    } catch (erro) {
      console.error('Erro ao restaurar backup:', erro);
      throw erro;
    }
  }
  
  /**
   * Lista todos os backups disponíveis
   * @returns {Array<string>} - Lista de arquivos de backup
   */
  listarBackups() {
    const arquivos = fs.readdirSync(this.backupDir)
      .filter(file => file.endsWith('.sql'))
      .map(file => ({
        arquivo: file,
        caminho: path.join(this.backupDir, file),
        tamanho: fs.statSync(path.join(this.backupDir, file)).size,
        data: fs.statSync(path.join(this.backupDir, file)).mtime
      }))
      .sort((a, b) => b.data - a.data); // Ordenar do mais recente para o mais antigo
    
    return arquivos;
  }
  
  /**
   * Verifica a integridade do banco de dados
   * @returns {Promise<Object>} - Resultado da verificação
   */
  async verificarIntegridade() {
    console.log('Verificando integridade do banco de dados...');
    
    const resultados = {
      tabelas: [],
      relacionamentos: [],
      indices: [],
      problemas: []
    };
    
    try {
      // Verificar existência das tabelas principais
      const tabelasEsperadas = [
        'perfil_acesso', 
        'cad_emp_user', 
        'metadados_arquivos', 
        'compartilhamento_arquivos',
        'categorias_arquivos'
      ];
      
      const tabelas = await db.listarTabelas();
      const tabelasExistentes = tabelas.map(t => t.tablename);
      
      resultados.tabelas = tabelasEsperadas.map(tabela => ({
        nome: tabela,
        existe: tabelasExistentes.includes(tabela)
      }));
      
      // Verificar tabelas com problemas
      for (const tabela of tabelasEsperadas) {
        if (!tabelasExistentes.includes(tabela)) {
          resultados.problemas.push(`Tabela ${tabela} não encontrada`);
          continue;
        }
        
        // Verificar integridade da tabela
        try {
          await db.executarQuery(`ANALYZE VERBOSE ${tabela};`);
        } catch (erro) {
          resultados.problemas.push(`Problema na tabela ${tabela}: ${erro.message}`);
        }
      }
      
      // Verificar funções e triggers
      const funcaoAdmin = await db.executarQuery(
        "SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'is_admin')"
      );
      
      if (!funcaoAdmin.rows[0].exists) {
        resultados.problemas.push('Função is_admin não encontrada');
      }
      
      console.log('Verificação de integridade concluída');
      return resultados;
    } catch (erro) {
      console.error('Erro ao verificar integridade:', erro);
      throw erro;
    }
  }
  
  /**
   * Executa operações de manutenção no banco
   * @returns {Promise<Object>} - Resultado da manutenção
   */
  async executarManutencao() {
    console.log('Iniciando manutenção do banco de dados...');
    
    try {
      // Executar VACUUM para recuperar espaço e otimizar
      await db.executarQuery('VACUUM FULL ANALYZE;');
      console.log('VACUUM FULL concluído');
      
      // Reindexar bancos
      await db.executarQuery('REINDEX DATABASE postgres;');
      console.log('REINDEX concluído');
      
      console.log('Manutenção concluída com sucesso!');
      return { sucesso: true, mensagem: 'Manutenção concluída com sucesso' };
    } catch (erro) {
      console.error('Erro durante manutenção:', erro);
      return { sucesso: false, erro: erro.message };
    }
  }
}

// Exportar a classe
module.exports = new ManutencaoBanco();

// Exemplo de uso
async function exemploDeUso() {
  const manutencao = module.exports;
  
  try {
    // Listar backups existentes
    console.log('Backups disponíveis:');
    const backups = manutencao.listarBackups();
    console.table(backups);
    
    // Realizar novo backup
    const novoBackup = await manutencao.realizarBackup();
    
    // Verificar integridade
    const integridade = await manutencao.verificarIntegridade();
    console.log('Resultado da verificação de integridade:');
    console.log(JSON.stringify(integridade, null, 2));
    
    // Se houver problemas, sugerir manutenção
    if (integridade.problemas.length > 0) {
      console.log(`Foram encontrados ${integridade.problemas.length} problemas. Executando manutenção...`);
      const resultadoManutencao = await manutencao.executarManutencao();
      console.log('Resultado da manutenção:', resultadoManutencao);
    }
  } catch (erro) {
    console.error('Erro:', erro);
  } finally {
    // Fechar conexões
    await db.fecharConexoes();
  }
}

// Descomente a linha abaixo para executar o exemplo
// exemploDeUso();
