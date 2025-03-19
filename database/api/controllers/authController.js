/**
 * Controller de autenticação
 * Gerencia login, registro e gerenciamento de tokens
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');

// Login de usuário
const login = async (req, res, next) => {
  try {
    const { email, senha } = req.body;
    
    // Verificar se o usuário existe
    const result = await db.query(`
      SELECT 
        u.id, 
        u.nome, 
        u.email, 
        u.auth_id, 
        p.tipo as perfil
      FROM cad_emp_user u
      JOIN perfil_acesso p ON u.perfil_id = p.id
      WHERE u.email = $1 AND u.ativo = TRUE
    `, [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    const user = result.rows[0];
    
    // Na implementação real, verificar a senha com bcrypt
    // Por enquanto, apenas simular a verificação
    // const senhaCorreta = await bcrypt.compare(senha, user.senha_hash);
    
    // Gerar token JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        nome: user.nome, 
        perfil: user.perfil 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    // Retornar dados do usuário e token
    return res.status(200).json({
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil
      },
      token
    });
    
  } catch (error) {
    next(error);
  }
};

// Obter informações do usuário autenticado
const me = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Buscar dados atualizados do usuário
    const result = await db.query(`
      SELECT 
        u.id, 
        u.nome, 
        u.email, 
        u.telefone,
        u.empresa,
        u.cargo,
        p.tipo as perfil
      FROM cad_emp_user u
      JOIN perfil_acesso p ON u.perfil_id = p.id
      WHERE u.id = $1 AND u.ativo = TRUE
    `, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    return res.status(200).json(result.rows[0]);
    
  } catch (error) {
    next(error);
  }
};

// Registrar novo usuário
const register = async (req, res, next) => {
  try {
    const { nome, email, senha, telefone, empresa, cargo } = req.body;
    
    // Verificar se o email já está em uso
    const emailCheck = await db.query(
      'SELECT id FROM cad_emp_user WHERE email = $1',
      [email]
    );
    
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Email já está em uso' });
    }
    
    // Iniciar transação
    await db.transaction(async (client) => {
      // Obter o ID do perfil 'user'
      const perfilResult = await client.query(
        "SELECT id FROM perfil_acesso WHERE tipo = 'user'"
      );
      
      if (perfilResult.rows.length === 0) {
        throw new Error('Perfil de usuário não encontrado');
      }
      
      const perfilId = perfilResult.rows[0].id;
      
      // Criar o auth_id (em uma implementação real, seria o ID do usuário no Supabase Auth)
      const authId = uuidv4();
      
      // Em uma implementação real, seria usado bcrypt para a senha
      // const senhaHash = await bcrypt.hash(senha, 10);
      
      // Inserir o usuário
      const result = await client.query(`
        INSERT INTO cad_emp_user (
          nome, email, telefone, empresa, cargo, perfil_id, auth_id, ativo
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
        RETURNING id, nome, email
      `, [
        nome,
        email,
        telefone || null,
        empresa || null,
        cargo || null,
        perfilId,
        authId
      ]);
      
      const newUser = result.rows[0];
      
      // Gerar token JWT
      const token = jwt.sign(
        { 
          id: newUser.id, 
          email: newUser.email, 
          nome: newUser.nome, 
          perfil: 'user' 
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );
      
      // Retornar dados do usuário e token
      return res.status(201).json({
        user: {
          id: newUser.id,
          nome: newUser.nome,
          email: newUser.email,
          perfil: 'user'
        },
        token
      });
    });
    
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  me,
  register
};
