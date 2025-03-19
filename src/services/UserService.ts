// Interfaces para os tipos de dados sem conexão real
export interface PerfilAcesso {
  id: string;
  tipo: 'admin' | 'user';
  descricao?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CadEmpUser {
  id: string;
  auth_id: string;
  nome: string;
  email: string;
  telefone?: string;
  empresa?: string;
  cargo?: string;
  perfil_id: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
  perfil?: PerfilAcesso;
}

export interface CreateUserParams {
  email: string;
  password: string;
  nome: string;
  telefone?: string;
  empresa?: string;
  cargo?: string;
  perfil_id?: string;
  ativo?: boolean;
}

export interface UpdateUserParams {
  nome?: string;
  telefone?: string;
  empresa?: string;
  cargo?: string;
  perfil_id?: string;
  ativo?: boolean;
}

// Dados mock para simular respostas
const MOCK_PERFIS: PerfilAcesso[] = [
  { id: 'admin-id', tipo: 'admin', descricao: 'Administrador', created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z' },
  { id: 'user-id', tipo: 'user', descricao: 'Usuário', created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z' },
];

const MOCK_USERS: CadEmpUser[] = [
  {
    id: 'user-1',
    auth_id: 'auth-1',
    nome: 'Admin Teste',
    email: 'admin@example.com',
    telefone: '11999999999',
    empresa: 'Empresa Teste',
    cargo: 'Gerente',
    perfil_id: 'admin-id',
    ativo: true,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    perfil: MOCK_PERFIS[0],
  },
  {
    id: 'user-2',
    auth_id: 'auth-2',
    nome: 'Usuário Teste',
    email: 'user@example.com',
    telefone: '11888888888',
    empresa: 'Empresa Teste',
    cargo: 'Analista',
    perfil_id: 'user-id',
    ativo: true,
    created_at: '2023-02-01T00:00:00Z',
    updated_at: '2023-02-01T00:00:00Z',
    perfil: MOCK_PERFIS[1],
  },
];

/**
 * Serviço para gerenciar usuários e perfis de acesso - VERSÃO MOCK SEM CONEXÃO
 */
export class UserService {
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
    console.log('UserService: Inicializado em modo MOCK (sem conexão)');
  }

  /**
   * Verifica se o usuário atual é administrador
   */
  async isAdmin(): Promise<boolean> {
    console.log('UserService.isAdmin: Retornando valor MOCK');
    return true; // Sempre retorna true para fins de mock
  }

  /**
   * Obtém todos os perfis de acesso
   */
  async getPerfis(): Promise<PerfilAcesso[]> {
    console.log('UserService.getPerfis: Retornando dados MOCK');
    return [...MOCK_PERFIS]; // Retorna uma cópia da lista de perfis mock
  }

  /**
   * Obtém todos os usuários com seus perfis
   */
  async getUsers(): Promise<CadEmpUser[]> {
    console.log('UserService.getUsers: Retornando dados MOCK');
    return [...MOCK_USERS]; // Retorna uma cópia da lista de usuários mock
  }

  /**
   * Obtém um usuário pelo ID
   */
  async getUserById(id: string): Promise<CadEmpUser | null> {
    console.log(`UserService.getUserById: Buscando usuário com ID ${id} (MOCK)`);
    const user = MOCK_USERS.find(u => u.id === id);
    return user ? { ...user } : null;
  }

  /**
   * Obtém o usuário atual
   */
  async getCurrentUser(): Promise<CadEmpUser | null> {
    console.log('UserService.getCurrentUser: Retornando usuário atual MOCK');
    return { ...MOCK_USERS[0] }; // Retorna o primeiro usuário como se fosse o atual
  }

  /**
   * Cria um novo usuário
   */
  async createUser(params: CreateUserParams): Promise<CadEmpUser | null> {
    console.log('UserService.createUser: Criando usuário MOCK', params);
    
    // Simular validação de email duplicado
    if (MOCK_USERS.some(u => u.email === params.email)) {
      throw new Error('Já existe um usuário cadastrado com este email.');
    }
    
    // Criar novo usuário mock
    const newUser: CadEmpUser = {
      id: `user-${Date.now()}`,
      auth_id: `auth-${Date.now()}`,
      nome: params.nome,
      email: params.email,
      telefone: params.telefone,
      empresa: params.empresa,
      cargo: params.cargo,
      perfil_id: params.perfil_id || 'user-id',
      ativo: params.ativo !== undefined ? params.ativo : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      perfil: MOCK_PERFIS.find(p => p.id === (params.perfil_id || 'user-id')) || MOCK_PERFIS[1]
    };
    
    return { ...newUser };
  }

  /**
   * Atualiza um usuário existente
   */
  async updateUser(id: string, params: UpdateUserParams): Promise<CadEmpUser | null> {
    console.log(`UserService.updateUser: Atualizando usuário ${id} (MOCK)`, params);
    
    const user = MOCK_USERS.find(u => u.id === id);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }
    
    // Criar uma cópia atualizada
    const updatedUser: CadEmpUser = {
      ...user,
      nome: params.nome || user.nome,
      telefone: params.telefone !== undefined ? params.telefone : user.telefone,
      empresa: params.empresa !== undefined ? params.empresa : user.empresa,
      cargo: params.cargo !== undefined ? params.cargo : user.cargo,
      perfil_id: params.perfil_id || user.perfil_id,
      ativo: params.ativo !== undefined ? params.ativo : user.ativo,
      updated_at: new Date().toISOString(),
      perfil: params.perfil_id ? 
        (MOCK_PERFIS.find(p => p.id === params.perfil_id) || user.perfil) : 
        user.perfil
    };
    
    return { ...updatedUser };
  }

  /**
   * Exclui um usuário
   */
  async deleteUser(id: string): Promise<void> {
    console.log(`UserService.deleteUser: Excluindo usuário ${id} (MOCK)`);
    
    const user = MOCK_USERS.find(u => u.id === id);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }
    
    // Não faz nada, apenas simula uma exclusão bem-sucedida
  }
}
