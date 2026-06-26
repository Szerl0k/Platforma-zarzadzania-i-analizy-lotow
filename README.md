# Platforma zarządzania i analizy lotów

## Wymagania

- **Środowisko lokalne (konteneryzacja):**
  - Docker Desktop / Docker Engine z wtyczką Docker Compose
  - Git
- **Środowisko lokalne (bezpośrednio na hoście):**
  - Node.js (wersja >= 20.x)
  - npm (wersja >= 10.x)
  - PostgreSQL (wersja >= 16) z rozszerzeniem PostGIS
- **Środowisko chmurowe:**
  - Terraform (wersja >= 1.1.0)
  - Konto Microsoft Azure (z uprawnieniami do tworzenia zasobów)

## Uruchomienie środowiska deweloperskiego

Projekt można uruchomić lokalnie na dwa sposoby: przy użyciu kontenerów Docker Compose (metoda rekomendowana) lub bezpośrednio na maszynie deweloperskiej (na hoście).

### Metoda 1: Uruchomienie za pomocą Docker Compose

Ta metoda automatycznie kompiluje i orkiestruje kontenery bazy danych, backendu i frontendu.

1. Sklonuj repozytorium i przejdź do katalogu projektu:
   ```bash
   git clone https://github.com/Szerl0k/Platforma-zarzadzania-i-analizy-lotow.git
   cd Platforma-zarzadzania-i-analizy-lotow
   ```

2. Uruchom kontenery aplikacyjne:
   ```bash
   docker compose up --build
   ```
   Polecenie to zbuduje obrazy dla backendu i frontendu, pobierze obraz PostgreSQL z rozszerzeniem PostGIS i uruchomi wszystkie usługi.

3. Zatrzymanie aplikacji:
   * Aby zatrzymać kontenery (zachowując dane w bazie):
     ```bash
     docker compose down
     ```
   * Aby zatrzymać kontenery i całkowicie usunąć dane bazy danych (wraz z wolumenami):
     ```bash
     docker compose down -v
     ```

### Metoda 2: Uruchomienie lokalnie na hoście (bez Dockera)

Uruchomienie aplikacji bezpośrednio na systemie operacyjnym wymaga samodzielnego zainstalowania zależności, konfiguracji bazy danych PostgreSQL z rozszerzeniem PostGIS oraz uruchomienia procesów backendu i frontendu.

#### 1. Instalacja zależności
Należy zainstalować pakiety npm dla obu aplikacji:
* **Backend:**
  ```bash
  cd backend
  npm install
  ```
* **Frontend:**
  ```bash
  cd ../frontend
  npm install
  ```

#### 2. Konfiguracja bazy danych PostgreSQL z PostGIS
Aplikacja wymaga bazy danych PostgreSQL z włączonym rozszerzeniem PostGIS do obsługi zapytań przestrzennych.
1. Upewnij się, że lokalny serwer PostgreSQL jest uruchomiony.
2. Utwórz nową bazę danych o nazwie `flight_db`:
   ```bash
   psql -U postgres -c "CREATE DATABASE flight_db;"
   ```
3. Włącz rozszerzenie PostGIS w utworzonej bazie danych (jest to krok krytyczny przed uruchomieniem migracji, gdyż tabele bazy posiadają kolumny typu `geometry`):
   ```bash
   psql -U postgres -d flight_db -c "CREATE EXTENSION IF NOT EXISTS postgis;"
   ```
   *(Uwaga: Powyższe polecenia zakładają domyślnego użytkownika `postgres`. Możesz też użyć graficznych klientów takich jak pgAdmin lub DBeaver).*

#### 3. Konfiguracja zmiennych środowiskowych
* **Backend:** W katalogu `backend/` utwórz plik `.env` (na wzór `.env.example`) i uzupełnij go danymi dostępowymi do bazy danych:
  ```env
  DB_HOST=localhost
  DB_PORT=5432
  DB_NAME=flight_db
  DB_USER=postgres
  DB_PASSWORD=twoje_haslo_do_bazy
  PORT=5001
  JWT_SECRET=flight-mgmt-jwt-secret-change-in-production
  JWT_EXPIRES_IN=7d
  CORS_ORIGIN=http://localhost:3000
  ```
* **Frontend:** W katalogu `frontend/` utwórz plik `.env.local` ze zmiennymi (jeśli porty są domyślne, te wartości zostaną przyjęte automatycznie, lecz zaleca się ich jawne zdefiniowanie):
  ```env
  INTERNAL_API_URL=http://localhost:5001
  NEXT_PUBLIC_API_URL=/api
  ```

#### 4. Uruchomienie migracji i zasiewanie danych
Przed pierwszym uruchomieniem aplikacji należy przygotować strukturę bazy danych oraz zasilić ją początkowymi słownikami i danymi testowymi. W katalogu `backend/` wykonaj:
* **Uruchomienie migracji TypeORM:**
  ```bash
  npm run migration:run
  ```
* **Zasiewanie danych testowych (seeding):**
  ```bash
  npm run db:setup
  ```
  *(Można również użyć komendy łączonej `npm run ci:migrate-and-seed`, która wykona oba kroki sekwencyjnie).*

#### 5. Kompilacja i uruchomienie aplikacji
Aplikacje mogą być uruchamiane w trybie deweloperskim (z automatycznym przeładowywaniem) lub produkcyjnym (wymagającym wcześniejszej kompilacji).

* **Tryb deweloperski (Development):**
  * Backend (w katalogu `backend/`):
    ```bash
    npm run dev
    ```
  * Frontend (w katalogu `frontend/`):
    ```bash
    npm run dev
    ```

* **Tryb produkcyjny (Production):**
  * Backend (w katalogu `backend/`):
    ```bash
    npm run build
    npm run start
    ```
  * Frontend (w katalogu `frontend/`):
    ```bash
    npm run build
    npm run start
    ```

## Dostęp do aplikacji

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001/api/v1
- **Baza danych**: localhost:5432

## Komendy

### Docker Compose
```bash
docker compose up --build  # Zbudowanie i uruchomienie kontenerów
docker compose down        # Zatrzymanie kontenerów (zachowanie danych)
docker compose down -v     # Zatrzymanie kontenerów i usunięcie wolumenów (danych bazy)
```

### Lokalnie (Backend)
```bash
npm run dev               # Uruchomienie backendu w trybie deweloperskim
npm run build             # Kompilacja backendu (TypeScript do JS)
npm run start             # Uruchomienie skompilowanego backendu w trybie produkcyjnym
npm run migration:run     # Uruchomienie migracji TypeORM
npm run db:setup          # Zasiewanie (seeding) danych testowych
npm run test              # Uruchomienie testów jednostkowych/integracyjnych
```

### Lokalnie (Frontend)
```bash
npm run dev               # Uruchomienie frontendu w trybie deweloperskim
npm run build             # Kompilacja produkcyjna frontendu (Next.js)
npm run start             # Uruchomienie frontendu w trybie produkcyjnym
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
