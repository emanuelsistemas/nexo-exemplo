import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSupabase } from './SupabaseContext';
import { UserService, CadEmpUser, CreateUserParams } from '../services/UserService';

// Interfaces simplificadas sem dependências do Supabase
interface User {
  id: string;
  email: string;
  role?: string;
}

interface Session {
  user: User;
  access_token?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userData: CadEmpUser | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, nome: string, empresa?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { supabase } = useSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<CadEmpUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Inicializar o serviço de usuários
  const userService = new UserService(supabase);

  // Carregar dados do usuário (versão mock)
  const loadUserData = async (currentSession: Session | null) => {
    if (!currentSession) {
      setUserData(null);
      setIsAdmin(false);
      return;
    }

    try {
      console.log('AuthContext: Carregando dados do usuário mock');
      
      // Verificar se é admin (sempre retorna true no mock)
      const adminStatus = await userService.isAdmin();
      setIsAdmin(adminStatus);
      
      // Carregar dados do usuário mock
      const currentUserData = await userService.getCurrentUser();
      setUserData(currentUserData);
    } catch (error) {
      console.error('Erro ao carregar dados do usuário (mock):', error);
    }
  };

  useEffect(() => {
    console.log('AuthContext: Inicializando com dados mock');
    
    // Simular obtendo sessão atual
    setTimeout(() => {
      const mockSession = {
        user: {
          id: 'mock-user-id',
          email: 'user@example.com',
        },
        access_token: 'mock-token-xyz'
      };
      
      setSession(mockSession);
      setUser(mockSession.user);
      loadUserData(mockSession);
      setLoading(false);
    }, 800);

    // Simular configuração de listener
    console.log('AuthContext: Configurando listener mock');

    return () => {
      console.log('AuthContext: Desmontando contexto mock');
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log(`AuthContext: Tentativa de login mock com ${email}`);
    
    // Simular verificação de credenciais
    if (email && password.length >= 6) {
      // Credenciais válidas (qualquer email e senha com 6+ caracteres)
      const mockUser = {
        id: 'mock-user-id',
        email: email,
      };
      
      const mockSession = {
        user: mockUser,
        access_token: 'mock-token-xyz'
      };
      
      setSession(mockSession);
      setUser(mockUser);
      loadUserData(mockSession);
      
      return { error: null };
    } else {
      // Credenciais inválidas
      return { error: { message: 'Credenciais inválidas' } };
    }
  };

  const signUp = async (email: string, password: string, nome: string, empresa?: string) => {
    console.log(`AuthContext: Tentativa de cadastro mock para ${email}`);
    
    // Verificar se todos os campos foram preenchidos
    if (!email || !password || !nome) {
      return { error: { message: 'Todos os campos obrigatórios devem ser preenchidos' } };
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { error: { message: 'Formato de email inválido' } };
    }
    
    // Validar tamanho da senha
    if (password.length < 6) {
      return { error: { message: 'A senha deve ter pelo menos 6 caracteres' } };
    }
    
    // Validar nome de usuário
    if (nome.length < 3) {
      return { error: { message: 'O nome deve ter pelo menos 3 caracteres' } };
    }

    try {
      // Criar usuário mock usando o serviço de usuários
      const userParams: CreateUserParams = {
        email,
        password,
        nome,
        empresa
      };
      
      await userService.createUser(userParams);
      
      // Simular login após cadastro
      const mockUser = {
        id: 'mock-user-' + Date.now(),
        email: email,
      };
      
      const mockSession = {
        user: mockUser,
        access_token: 'mock-token-' + Date.now()
      };
      
      setSession(mockSession);
      setUser(mockUser);
      loadUserData(mockSession);
      
      return { error: null };
    } catch (error: any) {
      console.error('Erro no processo de cadastro (mock):', error);
      return { error: { message: error.message || 'Erro ao criar usuário' } };
    }
  };

  const signOut = async () => {
    console.log('AuthContext: Logout mock');
    setSession(null);
    setUser(null);
    setUserData(null);
    setIsAdmin(false);
  };

  const value = {
    session,
    user,
    userData,
    isAdmin,
    loading,
    signIn,
    signUp,
    signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export default AuthContext;
