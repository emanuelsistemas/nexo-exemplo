# Nexo PDV

Sistema de Ponto de Venda (PDV) com tema cyberpunk, construído com React e conexão robusta ao PostgreSQL.

## Visão Geral

O Nexo PDV é um sistema moderno e eficiente para gerenciamento de vendas, inventário e clientes, com uma interface inspirada em design cyberpunk. O sistema utiliza tecnologias modernas para garantir performance e segurança.

## Componentes

O projeto é dividido em três componentes principais:

1. **Frontend React**: Interface de usuário construída com React e styled-components, seguindo um tema cyberpunk.
2. **API REST**: Backend que gerencia a comunicação entre o frontend e o banco de dados.
3. **PostgreSQL**: Banco de dados para armazenamento de dados de produtos, vendas, usuários e configurações.

## Configuração e Inicialização

### Requisitos

- Node.js v14+
- PostgreSQL 12+
- npm ou yarn

### Configurando o Ambiente

1. Clone o repositório:
   ```
   git clone https://github.com/m-software/nexo-pdv.git
   cd nexo-pdv
   ```

2. Instale as dependências:
   ```
   npm install
   ```

3. Configure as variáveis de ambiente:
   - Renomeie o arquivo `.env.example` para `.env`
   - Ajuste as configurações conforme necessário

### Iniciando o Projeto

Para iniciar o frontend de desenvolvimento:
```
npm start
```

## Recursos

- Autenticação de usuários com diferentes níveis de permissão
- Gestão de inventário de produtos
- Processamento de vendas e recibos
- Histórico de transações
- Dashboard com estatísticas de vendas
- Integração com impressoras térmicas

## Documentação

Para mais detalhes sobre a implementação e uso do sistema, consulte:
- [Documentação do Banco de Dados](./database/README.md)
- [Documentação da API](./database/api/README.md)
- [Guia do Usuário](./documentacao/README.md)

## Segurança

O sistema implementa medidas de segurança como:
- JWT para autenticação e autorização
- Row Level Security (RLS) no PostgreSQL
- Validação de dados e proteção contra injeção de SQL
- HTTPS para comunicação segura

## Licença

Este projeto é proprietário e pertence à M-Software. Todos os direitos reservados.
