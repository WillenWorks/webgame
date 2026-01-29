# Operação Mundo - Frontend (Nuxt 3 Pixel Art)

Interface moderna e estilizada para o jogo "Operação Mundo", construída com Nuxt 3 e TailwindCSS v4.

## Estrutura do Projeto

- `assets/css/main.css`: Tema global (Pixel Art / Retro Spy).
- `components/ui`: Componentes reutilizáveis (`RetroCard`, `RetroButton`).
- `composables`:
  - `useApi.ts`: Cliente HTTP com suporte a Token JWT.
  - `useAuth.ts`: Gerenciamento de Login/Registro.
  - `useGame.ts`: Estado do jogo (Perfil, Casos, Viagem).
- `pages`:
  - `index.vue`: Tela de Boot.
  - `login.vue`: Autenticação.
  - `dashboard.vue`: QG do Agente (Criação de Perfil / Lista de Missões).
  - `cases/[id]/map.vue`: Mapa Mundi.
  - `cases/[id]/city.vue`: Investigação.

## Como Rodar

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

3. Acesse `http://localhost:3000`.

## Integração com Backend

O frontend espera a API rodando em `http://localhost:3333/api/v1`.
Configure via variável de ambiente `NUXT_PUBLIC_API_BASE_URL` se necessário.
