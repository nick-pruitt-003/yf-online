# YellowFruit Online

Web-based quiz bowl tournament stat management, built on top of [YellowFruit](https://github.com/ANadig/YellowFruit) by Andrew Nadig.

Store, edit, and share tournaments in your browser — no desktop app required.

## Features

- Create and manage quiz bowl tournaments
- Import existing YellowFruit (`.yft`) files
- Share tournaments with other users (view or edit access)
- User accounts with email verification
- Export to SQBS and HTML stat reports

## Tech Stack

- **Next.js 16** (App Router) + **React 19**
- **PostgreSQL** via **Prisma 7**
- **Better-Auth** for authentication
- **Material UI 7** + Tailwind CSS 4

## Getting Started

### Prerequisites

- Node.js ≥ 22.13.0
- PostgreSQL database

### Setup

```bash
git clone https://github.com/nick-pruitt-003/yf-online.git
cd yf-online
npm install
```

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Random secret for session encryption |
| `BETTER_AUTH_URL` | Base URL of the app (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_APP_URL` | Same as above, exposed to the client |

Apply the database schema and start the dev server:

```bash
npx prisma migrate deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Generate Prisma client and build for production |
| `npm run start` | Run migrations and start production server |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push schema changes without a migration |
| `npm run db:studio` | Open Prisma Studio |

## Deployment

The project is configured for [Railway](https://railway.app) via `railway.toml`. Set the four environment variables above in your Railway service, attach a PostgreSQL database, and deploy from the `main` branch.

## License

[AGPL-3.0](LICENSE). This project is a derivative of [YellowFruit](https://github.com/ANadig/YellowFruit) (AGPL-3.0, Copyright © Andrew Nadig). See [NOTICE](NOTICE) for details.
