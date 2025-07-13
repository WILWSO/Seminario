# SEMBRAR Seminary Application

Uma aplicação web moderna para o Seminário Bíblico Reformado da Argentina (SEMBRAR), construída com React, TypeScript, Tailwind CSS e Supabase.

## 🚀 Funcionalidades

### Para Estudantes
- Dashboard personalizado com progresso dos cursos
- Visualização de cursos disponíveis e inscritos
- Acesso a módulos e lições
- Acompanhamento de progresso
- Visualização de anúncios importantes

### Para Professores
- Dashboard com estatísticas dos cursos
- Gerenciamento de cursos e conteúdo
- Sistema de calificações
- Visualização de estudantes inscritos

### Para Administradores
- Dashboard administrativo completo
- Gerenciamento de usuários
- Criação e edição de anúncios
- Estatísticas do sistema
- Controle de acesso baseado em roles

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Roteamento**: React Router DOM
- **Animações**: Framer Motion
- **Ícones**: Lucide React
- **Build Tool**: Vite

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Conta no Supabase

## 🔧 Instalação e Configuração

### 1. Clone o repositório
```bash
git clone <repository-url>
cd sembrar-seminary-app
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure o Supabase

1. Crie um novo projeto no [Supabase](https://supabase.com)
2. No SQL Editor, execute o arquivo `supabase/migrations/create_sembrar_schema.sql`
3. Execute também o arquivo `supabase/migrations/insert_sample_data.sql` para dados de exemplo
4. Configure as variáveis de ambiente (serão definidas automaticamente quando conectar ao Supabase)

### 4. Execute a aplicação
```bash
npm run dev
```

## 🔐 Autenticação e Usuários

### Usuários de Teste

Para testar a aplicação, você pode criar usuários através do painel de autenticação do Supabase ou usar a funcionalidade de registro da aplicação.

**Roles disponíveis:**
- `student`: Acesso ao portal de estudantes
- `teacher`: Acesso ao portal de professores  
- `admin`: Acesso completo ao sistema

### Primeiro Acesso

1. Registre-se através da página de login
2. O primeiro usuário registrado pode ser promovido a admin através do SQL Editor do Supabase:
```sql
UPDATE users SET role = 'admin' WHERE email = 'seu-email@exemplo.com';
```

## 📊 Estrutura do Banco de Dados

### Tabelas Principais

- **users**: Perfis de usuários (estudantes, professores, admins)
- **courses**: Cursos oferecidos pelo seminário
- **modules**: Módulos dentro de cada curso
- **lessons**: Lições individuais dentro dos módulos
- **enrollments**: Inscrições de estudantes em cursos
- **assignments**: Tarefas e avaliações
- **grades**: Notas dos estudantes
- **completed_lessons**: Controle de progresso das lições
- **announcements**: Anúncios administrativos

### Segurança (RLS)

Todas as tabelas possuem Row Level Security (RLS) habilitado com políticas específicas para cada role:

- **Estudantes**: Acesso apenas aos próprios dados e cursos inscritos
- **Professores**: Acesso aos próprios cursos e estudantes inscritos
- **Administradores**: Acesso completo ao sistema

## 🎨 Design e UI/UX

- Design responsivo para desktop e mobile
- Tema escuro/claro
- Animações suaves com Framer Motion
- Paleta de cores moderna em tons de azul
- Interface intuitiva e acessível

## 📱 Responsividade

A aplicação é totalmente responsiva e funciona em:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (320px - 767px)

## 🔄 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview

# Linting
npm run lint
```

## 📞 Contato

- **Email**: ipamarcospaz@gmail.com
- **Telefone**: +54 11 2601 1240
- **Localização**: Buenos Aires, Argentina

## 📄 Licença

Este projeto é propriedade do Seminário Bíblico Reformado da Argentina (SEMBRAR).

## 🤝 Contribuição

Para contribuir com o projeto:

1. Faça um fork do repositório
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 🐛 Reportar Bugs

Para reportar bugs ou solicitar funcionalidades, abra uma issue no repositório ou entre em contato através do email: ipamarcospaz@gmail.com