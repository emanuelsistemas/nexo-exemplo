/**
 * Configuração baseada em variáveis de ambiente para o Drive Vale-Sis
 * Esta versão prioriza o uso de variáveis de ambiente, com fallbacks para valores padrão
 */

// Carregar variáveis de ambiente se o dotenv estiver disponível
try {
  const dotenv = require('dotenv');
  const path = require('path');
  
  // Tentar carregar de .env no diretório atual
  dotenv.config();
  
  // Tentar carregar de .env no diretório ~/.config/supabase-mcp
  const envPath = path.join(process.env.HOME || '/root', '.config', 'supabase-mcp', '.env');
  dotenv.config({ path: envPath });
  
  console.log('✅ Variáveis de ambiente carregadas');
} catch (erro) {
  console.log('⚠️ dotenv não encontrado, usando valores configurados no código');
}

// Função para obter variável de ambiente ou valor padrão
const env = (name, defaultValue) => process.env[name] || defaultValue;

// Configurações PostgreSQL
const postgres = {
  // Priorizar variáveis de ambiente, com fallbacks para valores padrão
  host: env('POSTGRES_HOST', env('SUPABASE_DB_HOST', 'drive-vale-sis_supabase-db-1')),
  port: parseInt(env('POSTGRES_PORT', env('SUPABASE_DB_PORT', '5432'))),
  database: env('POSTGRES_DB', env('SUPABASE_DB_NAME', 'postgres')),
  user: env('POSTGRES_USER', env('SUPABASE_DB_USER', 'postgres')),
  password: env('POSTGRES_PASSWORD', env('SUPABASE_DB_PASSWORD', 'your-super-secret-and-long-postgres-password')),
  ssl: env('POSTGRES_SSL', 'false').toLowerCase() === 'true'
};

// Configurações de fallback (IP)
const postgresFallback = {
  host: env('POSTGRES_FALLBACK_HOST', '172.19.0.4'),
  port: parseInt(env('POSTGRES_FALLBACK_PORT', '5432')),
  database: env('POSTGRES_FALLBACK_DB', 'postgres'),
  user: env('POSTGRES_FALLBACK_USER', 'postgres'),
  password: env('POSTGRES_FALLBACK_PASSWORD', 'your-super-secret-and-long-postgres-password'),
  ssl: env('POSTGRES_FALLBACK_SSL', 'false').toLowerCase() === 'true'
};

// Configurações Supabase
const supabase = {
  url: env('SUPABASE_URL', 'http://172.19.0.13:8000'),
  key: env('SUPABASE_SERVICE_ROLE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q'),
  local: env('SUPABASE_LOCAL', 'true').toLowerCase() === 'true',
  poolerEnabled: env('SUPABASE_POOLER_ENABLED', 'false').toLowerCase() === 'true',
  region: env('SUPABASE_REGION', 'local'),
  projectRef: env('SUPABASE_PROJECT_REF', 'drive-vale-sis')
};

// Exemplo de como imprimir a configuração (útil para debug)
const printConfig = () => {
  console.log('\n📋 Configuração atual:');
  console.log('PostgreSQL:');
  // Ocultar senha no log
  const logPostgres = { ...postgres, password: '********' };
  console.log(JSON.stringify(logPostgres, null, 2));
  
  console.log('\nSupabase:');
  // Ocultar chave no log
  const logSupabase = { ...supabase, key: supabase.key.substring(0, 10) + '...' };
  console.log(JSON.stringify(logSupabase, null, 2));
  
  // Log das variáveis de ambiente disponíveis relacionadas
  console.log('\nVariáveis de ambiente detectadas:');
  const envVars = Object.keys(process.env)
    .filter(key => key.includes('POSTGRES') || key.includes('SUPABASE') || key.includes('DB_'))
    .reduce((obj, key) => {
      // Ocultar senhas e chaves
      if (key.includes('PASSWORD') || key.includes('KEY')) {
        obj[key] = '********';
      } else {
        obj[key] = process.env[key];
      }
      return obj;
    }, {});
  
  console.log(JSON.stringify(envVars, null, 2));
};

// Funções auxiliares - Tenta conectar primeiro com o nome do host, depois com IP
const obterConfiguracaoDb = async () => {
  try {
    const { Pool } = require('pg');
    try {
      // Primeiro tenta com a configuração principal
      const pool = new Pool(postgres);
      const client = await pool.connect();
      client.release();
      await pool.end();
      console.log(`Usando conexão com: ${postgres.host}`);
      return postgres;
    } catch (erro) {
      // Se falhar, tenta com a configuração de fallback
      console.log(`Falha ao conectar com ${postgres.host}: ${erro.message}`);
      console.log(`Tentando conexão alternativa com: ${postgresFallback.host}`);
      
      const pool = new Pool(postgresFallback);
      const client = await pool.connect();
      client.release();
      await pool.end();
      return postgresFallback;
    }
  } catch (erro) {
    console.error('Erro em ambas as tentativas de conexão:', erro.message);
    throw new Error('Não foi possível estabelecer conexão com o banco de dados');
  }
};

// Comando para criar arquivo .env de exemplo
const generateEnvFile = (outputPath) => {
  const fs = require('fs');
  const path = require('path');
  
  const envContent = `# Configurações PostgreSQL
POSTGRES_HOST=drive-vale-sis_supabase-db-1
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-super-secret-and-long-postgres-password
POSTGRES_SSL=false

# IP de fallback (caso o nome do host não funcione)
POSTGRES_FALLBACK_HOST=172.19.0.4

# Configurações Supabase
SUPABASE_URL=http://172.19.0.13:8000
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q
SUPABASE_LOCAL=true
SUPABASE_POOLER_ENABLED=false
SUPABASE_REGION=local
SUPABASE_PROJECT_REF=drive-vale-sis
`;

  fs.writeFileSync(path.resolve(outputPath || '.env.example'), envContent);
  console.log(`✅ Arquivo .env de exemplo criado em: ${outputPath || '.env.example'}`);
};

// Exportar configurações e funções auxiliares
module.exports = {
  postgres,
  postgresFallback,
  supabase,
  obterConfiguracaoDb,
  printConfig,
  generateEnvFile
};

// Se executado diretamente, mostrar a configuração atual
if (require.main === module) {
  printConfig();
  
  // Criar arquivo .env de exemplo
  generateEnvFile('.env.example');
}
