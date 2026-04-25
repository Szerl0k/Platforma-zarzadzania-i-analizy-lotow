# Platforma zarządzania i analizy lotów

## Wymagania

- Środowisko lokalne:
- Docker Desktop
- Git
- Środowisko chmurowe:
- Terraform (wersja >= 1.1.0)
- Konto Microsoft Azure (z uprawnieniami do tworzenia zasobów)

## Uruchomienie środowiska deweloperskiego

```bash
git clone https://github.com/Szerl0k/Platforma-zarzadzania-i-analizy-lotow.git
cd Platforma-zarzadzania-i-analizy-lotow
docker compose up --build
```

## Dostęp do aplikacji

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001/api/v1
- **Baza danych**: localhost:5432

## Komendy

```bash
docker compose up --build
docker compose down
docker compose down -v
```

## Stack technologiczny

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS.
- **Backend**: Node.js, Express.js, TypeScript.
- **Baza danych**: PostgreSQL z rozszerzeniem PostGIS. Zoptymalizowana do zapytań przestrzennych z wykorzystaniem indeksów GIST.
- **IaC**: Terraform. Definicje zasobów dla chmury Microsoft Azure. Stan zarządzany i przechowywany w Azure Blob Storage.
- **Chmura publiczna**: Microsoft Azure (Azure App Service dla aplikacji, Virtual Machine dla bazy danych).
- **Konteneryzacja**: Docker.
- **CI/CD**: GitHub Actions.

## Automatyzacja wdrożeń

Projekt wykorzystuje potok GitHub Actions, który automatyzuje cykl życia oprogramowania:
1. **Infrastruktura**: Autoryzacja OIDC i wdrażanie zmian w infrastrukturze chmurowej za pomocą polecenia `terraform apply`.
2. **Baza danych**: Wykonywanie skryptów migracyjnych schematu bazy danych oraz ładowanie seeding.
3. **Budowanie obrazów**: Generowanie obrazów kontenerów dla Frontendu i Backendu jako Multi-stage builds i zapisem do Docker Hub.
4. **Wdrożenie**: Aktualizacja powiązanych kontenerów w ramach usługi Azure App Service.

## Struktura projektu

```text
├── .github/           # Definicje przepływów pracy (Workflows) dla CI/CD
├── backend/           # Aplikacja serwerowa API (TypeScript + Express)
├── docs/              # Dokumentacja techniczna i rejestry decyzji architektonicznych (ADR)
├── frontend/          # Aplikacja kliencka (Next.js + React)
├── infrastructure/    # Infrastruktura jako kod (Terraform dla Microsoft Azure)
├── docker-compose.yml # Orkiestracja kontenerów dla środowiska lokalnego
└── README.md
```
