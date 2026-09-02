# Banco de Dados — Setup (PostgreSQL + Prisma)

Infraestrutura entregue pelo **Agente 1 (DevOps & Database)** — Seção 1 de [tasks.md](tasks.md).

## Stack

| Camada        | Tecnologia                          |
| ------------- | ----------------------------------- |
| Banco         | PostgreSQL 16 (Alpine) via Docker   |
| ORM           | Prisma (`backend/prisma/schema.prisma`) |
| Migrations    | `prisma migrate` (`backend/prisma/migrations/`) |
| Seed          | `backend/prisma/seed.js`            |
| Client        | Singleton em `backend/src/config/prisma.js` |

## Passo a passo

```bash
# 1. Variáveis de ambiente
cp .env.example .env                 # credenciais do Postgres (docker compose)
cp backend/.env.example backend/.env # DATABASE_URL e afins (lido pelo Prisma)

# 2. Subir o banco
docker compose up -d                 # PostgreSQL em localhost:5433, volume `operacao-mundo-pgdata`
docker compose ps                    # aguardar STATUS = healthy

# 3. Migrar + gerar client (dentro de backend/)
cd backend
npx prisma migrate dev               # aplica migrations e roda `prisma generate`
npx prisma db seed                   # popula cidades, atributos, patentes, regras

# 4. Conferir (opcional)
npx prisma studio                    # UI em http://localhost:5555
```

## `DATABASE_URL`

```
DATABASE_URL="postgresql://mundo:mundo_dev@localhost:5433/operacao_mundo?schema=public"
```

Usamos a porta de host **5433** por padrão (a `5432` costuma estar ocupada por outro
Postgres local, ex.: `portal-gundam-tcg-postgres`). Dentro do container o Postgres
continua em `5432`.

As credenciais (`mundo` / `mundo_dev` / `operacao_mundo`) e a porta são configuráveis
pelo `.env` da raiz (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`).
Se mudar `POSTGRES_PORT`, ajuste a mesma porta no `DATABASE_URL` de `backend/.env`.

## O que o seed popula (idempotente)

- **6 regiões**, **34 países**, **37 cidades** mundiais com coordenadas (`latitude`/`longitude`) e dica cultural (`description_prompt`)
- **Vizinhança** entre países (17 pares, bidirecional) — usada no cálculo de tempo de viagem
- **12 tipos de local** com arquétipo de NPC para a IA
- **55 atributos** de suspeito (sexo, cabelo, hobby, veículo, traço)
- **3 dificuldades** (`EASY`/`HARD`/`EXTREME`) + regras de XP + **5 faixas** de reputação
- **6 patentes**: Recruta da ACME → Diretor da ACME

## Comandos úteis

```bash
docker compose down          # para o banco (mantém os dados)
docker compose down -v       # para o banco e APAGA o volume
npx prisma migrate reset     # dropa o schema, re-migra e re-semeia (dev)
```
