# Scripts de Gerenciamento do Banco de Dados

Este diretório contém scripts essenciais para gerenciar o banco de dados do Drive Vale-Sis.

## Scripts Principais

### Configuração
- **config-env.js** - Configuração que utiliza variáveis de ambiente para conexão com o banco
- **config.js** - Configuração com fallback para conexão por IP (compatibilidade)
- **config-docker.js** - Configuração específica para ambiente Docker

### Criação e Manutenção do Schema
- **criar-schema-drive.js** - Cria ou atualiza o schema completo do Drive Vale-Sis
- **configurar-rls.js** - Configura políticas de Row Level Security para controle de acesso
- **inserir-dados-exemplo.js** - Popula o banco com dados iniciais para desenvolvimento

### Utilitários
- **conexao-robusta-otimizada.js** - Módulo de conexão robusta que tenta nomes de container e IPs
- **executar-sql.js** - Utilitário para executar comandos SQL ad-hoc
- **gerenciar-banco.js** - Ferramenta de gerenciamento do banco (listar tabelas, consultar, etc)
- **manutencao.js** - Rotinas de manutenção (vacuum, análise, etc)
- **testar-conexao-robusta.js** - Validação da conexão robusta com o PostgreSQL

## Como Usar

1. Configure o arquivo `.env` seguindo o modelo em `.env.example`
2. Execute `criar-schema-drive.js` para criar o schema inicial
3. Execute `inserir-dados-exemplo.js` para popular o banco com dados iniciais
4. Use `testar-conexao-robusta.js` para verificar se a conexão está funcionando corretamente

### Exemplo de uso para inicialização completa:

```bash
# Copiar arquivo de exemplo de variáveis de ambiente
cp .env.example .env

# Editar variáveis de ambiente conforme necessário
nano .env

# Criar schema
node criar-schema-drive.js

# Configurar RLS
node configurar-rls.js

# Inserir dados iniciais
node inserir-dados-exemplo.js

# Verificar conexão
node testar-conexao-robusta.js
```

## Backup

Scripts de exemplo, testes e versões anteriores foram movidos para a pasta `backup/`.
