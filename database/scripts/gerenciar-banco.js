/**
 * Utilitário para gerenciar o banco de dados PostgreSQL do Drive Vale-Sis
 * Este script fornece funções para operações comuns no banco de dados
 */

const { Pool } = require('pg');
const config = require('./config');

// Criar pool de conexões
const pool = new Pool(config.postgres);

// Classe para gerenciar o banco de dados
class GerenciadorBancoDados {
  
  /**
   * Executa uma consulta SQL no banco de dados
   * @param {string} query - Consulta SQL a ser executada
   * @param {Array} params - Parâmetros para a consulta (opcional)
   * @returns {Promise} - Promise com o resultado da consulta
   */
  async executarQuery(query, params = []) {
    const client = await pool.connect();
    try {
      const result = await client.query(query, params);
      return result;
    } finally {
      client.release();
    }
  }
  
  /**
   * Lista todas as tabelas no schema public
   * @returns {Promise} - Promise com lista de tabelas
   */
  async listarTabelas() {
    const query = `
      SELECT tablename
      FROM pg_catalog.pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;
    
    const result = await this.executarQuery(query);
    return result.rows;
  }
  
  /**
   * Retorna a estrutura de uma tabela
   * @param {string} nomeTabela - Nome da tabela
   * @returns {Promise} - Promise com estrutura da tabela
   */
  async descreverTabela(nomeTabela) {
    const query = `
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM 
        information_schema.columns
      WHERE 
        table_schema = 'public' 
        AND table_name = $1
      ORDER BY 
        ordinal_position;
    `;
    
    const result = await this.executarQuery(query, [nomeTabela]);
    return result.rows;
  }
  
  /**
   * Cria uma nova tabela no banco de dados
   * @param {string} nomeTabela - Nome da tabela
   * @param {string} definicaoColunas - Definição SQL das colunas
   * @returns {Promise} - Promise com resultado da operação
   */
  async criarTabela(nomeTabela, definicaoColunas) {
    const query = `
      CREATE TABLE IF NOT EXISTS ${nomeTabela} (
        ${definicaoColunas}
      );
    `;
    
    return await this.executarQuery(query);
  }
  
  /**
   * Insere um ou mais registros em uma tabela
   * @param {string} nomeTabela - Nome da tabela
   * @param {Array} colunas - Lista de nomes das colunas
   * @param {Array} valores - Lista de listas de valores para inserir
   * @returns {Promise} - Promise com resultado da operação
   */
  async inserirRegistros(nomeTabela, colunas, valores) {
    // Construir a string de colunas
    const colunasStr = colunas.join(', ');
    
    // Construir as consultas para cada linha de valores
    const consultas = valores.map(linha => {
      const placeholders = linha.map((_, idx) => `$${idx + 1}`).join(', ');
      const query = `
        INSERT INTO ${nomeTabela} (${colunasStr})
        VALUES (${placeholders})
        RETURNING *;
      `;
      
      return this.executarQuery(query, linha);
    });
    
    return await Promise.all(consultas);
  }
  
  /**
   * Executa uma consulta SELECT em uma tabela
   * @param {string} nomeTabela - Nome da tabela
   * @param {string} colunas - Colunas a serem selecionadas (* para todas)
   * @param {string} condicao - Condição WHERE (opcional)
   * @param {Array} params - Parâmetros para a condição (opcional)
   * @returns {Promise} - Promise com resultado da consulta
   */
  async consultarTabela(nomeTabela, colunas = '*', condicao = '', params = []) {
    let query = `SELECT ${colunas} FROM ${nomeTabela}`;
    
    if (condicao) {
      query += ` WHERE ${condicao}`;
    }
    
    query += ';';
    
    return await this.executarQuery(query, params);
  }
  
  /**
   * Atualiza registros em uma tabela
   * @param {string} nomeTabela - Nome da tabela
   * @param {object} valores - Objeto com os valores a serem atualizados
   * @param {string} condicao - Condição WHERE
   * @param {Array} params - Parâmetros para a condição
   * @returns {Promise} - Promise com resultado da operação
   */
  async atualizarRegistros(nomeTabela, valores, condicao, params = []) {
    const sets = Object.keys(valores).map((coluna, idx) => 
      `${coluna} = $${idx + 1}`
    ).join(', ');
    
    const valoresArray = Object.values(valores);
    
    const query = `
      UPDATE ${nomeTabela}
      SET ${sets}
      WHERE ${condicao}
      RETURNING *;
    `;
    
    return await this.executarQuery(query, [...valoresArray, ...params]);
  }
  
  /**
   * Exclui registros de uma tabela
   * @param {string} nomeTabela - Nome da tabela
   * @param {string} condicao - Condição WHERE
   * @param {Array} params - Parâmetros para a condição
   * @returns {Promise} - Promise com resultado da operação
   */
  async excluirRegistros(nomeTabela, condicao, params = []) {
    const query = `
      DELETE FROM ${nomeTabela}
      WHERE ${condicao}
      RETURNING *;
    `;
    
    return await this.executarQuery(query, params);
  }
  
  /**
   * Fecha todas as conexões do pool
   */
  async fecharConexoes() {
    await pool.end();
  }
}

// Exportar a classe
module.exports = new GerenciadorBancoDados();
