# App Horários - Frontend

Sistema web para gerenciamento de horários acadêmicos da UFFS (Universidade Federal da Fronteira Sul).

## Sobre o Projeto

O App Horários é uma aplicação frontend desenvolvida para facilitar o gerenciamento e visualização de horários de aulas, componentes curriculares (CCRs), cursos, professores e ofertas de disciplinas na UFFS. O sistema conta com autenticação de usuários e controle de permissões granular para diferentes níveis de acesso.

## Funcionalidades

- **Autenticação de Usuários**: Sistema de login com JWT e refresh token
- **Controle de Permissões**: Gerenciamento baseado em grupos e permissões individuais
- **Gestão de Horários**: Criação, edição e visualização de horários de aulas
- **Componentes Curriculares (CCRs)**: Gerenciamento de disciplinas e ementas
- **Cursos**: Administração de cursos e suas ofertas
- **Docentes**: Cadastro e gerenciamento de professores
- **Ofertas**: Controle de ofertas de disciplinas por semestre
- **Tema Claro/Escuro**: Interface adaptável às preferências do usuário
- **Design Responsivo**: Interface otimizada para diferentes tamanhos de tela

## Tecnologias

### Core
- **[React 18](https://react.dev/)** - Biblioteca JavaScript para construção de interfaces
- **[Vite](https://vitejs.dev/)** - Build tool e bundler de nova geração
- **[React Router 7](https://reactrouter.com/)** - Roteamento da aplicação

### UI/UX
- **[Material-UI (MUI) 5](https://mui.com/)** - Biblioteca de componentes React
- **[MUI X Data Grid](https://mui.com/x/react-data-grid/)** - Tabelas avançadas com funcionalidades de edição
- **[Material Icons](https://mui.com/material-ui/material-icons/)** - Ícones do Material Design
- **[React Beautiful DnD](https://github.com/atlassian/react-beautiful-dnd)** - Drag and drop para React

### Comunicação e Estado
- **[Axios](https://axios-http.com/)** - Cliente HTTP com interceptors
- **React Context API** - Gerenciamento de estado global

### Ferramentas
- **[Yarn](https://yarnpkg.com/)** - Gerenciador de pacotes

## Estrutura do Projeto

```
app-horarios-front/
├── public/                 # Arquivos estáticos
├── src/
│   ├── auth/              # Configuração de autenticação
│   │   ├── axios.js       # Instância do Axios com interceptors
│   │   └── publicAxios.js # Instância do Axios para rotas públicas
│   ├── components/        # Componentes React
│   │   ├── App.jsx        # Componente principal
│   │   ├── CCRs.jsx       # Gestão de componentes curriculares
│   │   ├── Cursos.jsx     # Gestão de cursos
│   │   ├── Horarios.jsx   # Gestão de horários
│   │   ├── HorariosView.jsx # Visualização pública de horários
│   │   ├── Login.jsx      # Página de login
│   │   ├── Navbar.jsx     # Barra de navegação
│   │   ├── Ofertas.jsx    # Gestão de ofertas
│   │   └── Professores.jsx # Gestão de docentes
│   ├── contexts/          # Contextos React
│   │   ├── AuthContext.jsx      # Contexto de autenticação
│   │   ├── PermissionContext.jsx # Contexto de permissões
│   │   └── ProtectedRoute.jsx   # HOC para rotas protegidas
│   ├── enums/             # Enumeradores
│   │   └── permissoes.js  # Definições de permissões do sistema
│   ├── hooks/             # Custom Hooks
│   │   └── usePermissions.js # Hook para verificação de permissões
│   ├── services/          # Serviços de comunicação com API
│   │   ├── authService.js      # Serviço de autenticação
│   │   └── permissoesService.js # Serviço de permissões
│   ├── utils/             # Utilitários
│   │   └── columnPermissions.js # Gerenciamento de permissões de colunas
│   ├── catchall.tsx       # Rota catch-all
│   ├── entry.client.tsx   # Entrada do cliente
│   ├── root.tsx           # Componente raiz
│   └── routes.ts          # Configuração de rotas
├── package.json           # Dependências e scripts
├── vite.config.js         # Configuração do Vite
└── react-router.config.ts # Configuração do React Router
```

## Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js** (versão 16 ou superior)
- **Yarn** (gerenciador de pacotes)
- **Backend do App Horários** rodando (veja [app-horarios-api](https://github.com/ccuffs/app-horarios-api))

## Instalação

1. Clone o repositório:
```bash
git clone https://github.com/ccuffs/app-horarios-front.git
cd app-horarios/app-horarios-front
```

2. Instale as dependências:
```bash
yarn install
```

3. Configure as variáveis de ambiente:
Crie um arquivo `.env` na raiz do projeto:
```env
VITE_APP_API_URL=url_da_api
```

## Como Usar

### Modo Desenvolvimento

Execute o servidor de desenvolvimento:
```bash
yarn start
```

A aplicação estará disponível em [http://localhost:5173](http://localhost:5173)

### Build para Produção

Gere a build otimizada:
```bash
yarn build
```

Os arquivos serão gerados na pasta `build/`

### Visualizar Build de Produção

Para testar a build localmente:
```bash
yarn serve
```

## Sistema de Autenticação

O sistema utiliza autenticação baseada em JWT (JSON Web Tokens) com as seguintes características:

- **Login**: Autenticação via email/usuário e senha
- **Token de Acesso**: Armazenado no localStorage
- **Refresh Token**: Renovação automática de token quando expira
- **Interceptors**: Requisições HTTP incluem automaticamente o token de autenticação
- **Rotas Protegidas**: Verificação de autenticação e permissões antes de renderizar componentes

## Sistema de Permissões

O controle de acesso é baseado em:

- **Grupos de Usuários**: Usuários podem pertencer a múltiplos grupos
- **Permissões Granulares**: Controle fino sobre cada funcionalidade
- **Hierarquia de Permissões**:
  - Visualizar próprios dados
  - Visualizar todos os dados
  - Criar/Editar/Excluir

Principais categorias de permissões:
- `HORARIOS`: Gestão de horários
- `CCR`: Gestão de componentes curriculares
- `OFERTAS_CURSO`: Gestão de ofertas
- `DOCENTES`: Gestão de docentes

## Temas

O sistema suporta temas claro e escuro com:
- Alternância via switch na interface
- Persistência da preferência do usuário
- Cores personalizadas do Material-UI
- Transições suaves entre temas

## Testes

```bash
yarn test
```

## Scripts Disponíveis

- `yarn start` - Inicia o servidor de desenvolvimento
- `yarn build` - Gera build de produção
- `yarn serve` - Serve a build de produção localmente
- `yarn dev` - Inicia em modo de desenvolvimento com React Router Dev

## Contribuindo

Contribuições são bem-vindas! Por favor:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença especificada no arquivo [LICENSE](LICENSE).

## Links Relacionados

- [Backend - App Horários API](https://github.com/ccuffs/app-horarios-api)
- [Universidade Federal da Fronteira Sul](https://www.uffs.edu.br/)
- [Material-UI Documentation](https://mui.com/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)

## Equipe

Desenvolvido pela comunidade CCUFFS e contribuidores.

## Suporte

Para dúvidas ou problemas, abra uma [issue](https://github.com/ccuffs/app-horarios-front/issues) no GitHub.

---

Feito para a UFFS
