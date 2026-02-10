# Platforma zarządzania i analizy lotów

## Wymagania

- Docker Desktop
- Git

## Pierwsze uruchomienie

```bash
git clone https://github.com/Szerl0k/Platforma-zarzadzania-i-analizy-lotow.git
cd Platforma-zarzadzania-i-analizy-lotow
docker compose up --build
```

## Dostęp do aplikacji

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001/api/health
- **PostgreSQL**: localhost:5432

## Komendy

```bash
docker compose up --build
docker compose down
docker compose down -v
```

## Stack technologiczny

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL 16
- **Deployment**: Docker

## Struktura projektu

```
├── backend/           # Backend API (TypeScript + Express)
├── frontend/          # Frontend app (Next.js + React)
├── docker-compose.yml # Docker orchestration
└── README.md
```
