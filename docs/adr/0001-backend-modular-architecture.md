---
status: "zaakceptowano"
date: 2026-03-27
decision-makers:
  - Piotr Zapolski
  - Mikołaj Jacoszek
  - Paweł Rachocki
---

# ADR-0001: Architektura modularna backendu — Vertical Slice vs. Horizontal Layered

## Kontekst i opis problemu

Backend platformy do zarządzania lotami (Node.js, Express 5, TypeScript, TypeORM) obejmuje kilka domen biznesowych: zarządzanie użytkownikami i autoryzacja, dane lotów z telemetrią, dane geograficzne (lotniska, linie lotnicze, kraje) oraz integracje z zewnętrznymi API (OpenSky Network, AeroAPI).

Obecna struktura jest **horyzontalna** — wszystkie route handlery w `routes/`, wszystkie encje w `database/entities/`, middleware w `middleware/`. Przy 13 encjach w jednym katalogu i 5 plikach routingu obsługujących niezwiązane domeny, struktura ta utrudnia nawigację, wprowadza niejawne powiązania między domenami i powoduje konflikty przy równoczesnej pracy nad różnymi funkcjonalnościami.

**Pytanie:** jak zorganizować kod backendu na najwyższym poziomie, aby wspierać modularność i niezależny rozwój poszczególnych domen?

## Czynniki decyzyjne

* Kod zmieniany z tego samego powodu biznesowego powinien być zlokalizowany razem (Common Closure Principle)
* Modyfikacja jednej domeny nie powinna wymagać zmian w niepowiązanych domenach
* Struktura powinna komunikować cel aplikacji, nie jej szczegóły techniczne
* Trzech członków zespołu powinno móc pracować nad różnymi domenami bez konfliktów

## Rozważane opcje

1. **Architektura horyzontalna (warstwowa)** — status quo
2. **Vertical Slice Architecture** — moduły domenowe z wewnętrznymi warstwami
3. **Ścisłe Bounded Contexts (DDD)** — formalne konteksty ograniczone

## Wynik decyzji

Wybrana opcja: **„Vertical Slice Architecture"**, ponieważ zapewnia optymalną równowagę między modularnością a pragmatyzmem. Katalogi najwyższego poziomu odpowiadają domenom biznesowym, a wewnętrznie każdy moduł zawiera warstwy adekwatne do swojej złożoności — duże moduły mają pełną strukturę (routes/controllers/services/entities), małe mogą być uproszczone.

### Zasady zależności między modułami

Przy TypeORM z jedną współdzieloną bazą danych, relacje takie jak `@ManyToOne(() => Airport)` na encji `Flight` wymagają bezpośredniego dostępu do klasy encji z innego modułu. Jest to ograniczenie ORM, nie błąd architektury. Przyjęta zasada:

* **Dozwolone**: import **encji** między modułami (np. `flights/` importuje `Airport` z `geo/entities/`)
* **Zabronione**: import **serwisów i kontrolerów** między modułami — jeśli moduł potrzebuje logiki z innego modułu, komunikacja odbywa się przez wydzielony serwis w `common/` lub przez bezpośrednie zapytania do repozytorium encji

Dzięki temu relacje bazodanowe (`@ManyToOne`, `@ManyToMany`) działają prawidłowo, a logika biznesowa pozostaje zamknięta w granicach swojego modułu.

### Elastyczność struktury wewnętrznej modułów

Nie każdy moduł wymaga pełnej struktury routes/controllers/services/entities. Struktura wewnętrzna powinna być proporcjonalna do złożoności domeny:

* **Duży moduł** (np. `users/`) — pełna struktura z osobnymi katalogami na routes, controllers, services, entities
* **Średni moduł** (np. `flights/`) — pełna struktura lub uproszczona w zależności od liczby endpointów
* **Mały moduł** (np. `geo/`) — uproszczony układ: encje + pojedynczy plik routingu i serwisu

### Zasada spłaszczania jednoelementowych katalogów

Jeśli podkatalog w module zawierałby tylko jeden plik, nie tworzymy katalogu — używamy pojedynczego pliku bezpośrednio w module. Przykład: jeśli `users/controllers/` miałby tylko jeden kontroler, zamiast katalogu stosujemy `users/users.controller.ts`. Katalogi tworzymy dopiero gdy zawierają więcej niż jeden plik.

### Integracje jako część common

Klienty zewnętrznych API (OpenSky Network, AeroAPI) są współdzieloną infrastrukturą — nie stanowią osobnej domeny biznesowej. Dlatego umieszczamy je w `common/integrations/`, analogicznie do middleware czy konfiguracji bazy danych.

### Docelowa struktura

```
backend/src/
├── index.ts
├── common/
│   ├── middleware/        (auth.ts, errorHandler.ts)
│   ├── database/          (data-source.ts, migrations/, seeds/)
│   ├── integrations/      (opensky/, areoapi/)
│   └── types/             (express.d.ts)
├── users/                         # duży moduł — pełna struktura
│   ├── routes/            (auth.routes.ts, users.routes.ts, roles.routes.ts,
│   │                       permissions.routes.ts, preferences.routes.ts)
│   └── entities/          (User, Role, Permission, RolePermission,
│                           RefreshToken, UserPreferences)
├── flights/                       # średni moduł
│   └── entities/          (Flight, FlightStatus, FlightCodeshare, FlightTelemetry,
│                           FlightHistory, FlightStatusChange, FlightChangeType,
│                           TrackedFlight, TrackingStatus, TrackingSource,
│                           CustomFlightSimulation, SimulationStatus,
│                           FavouriteDestination)
└── geo/                           # mały moduł — uproszczony układ
    └── entities/          (Airport, City, Country, Airline)
```

### Konsekwencje

* Pozytywne: każdy moduł domenowy jest samodzielny — praca nad lotami odbywa się wyłącznie w `flights/`
* Pozytywne: jawne zależności między modułami zamiast niejawnego sąsiedztwa plików
* Pozytywne: minimalne konflikty merge przy pracy równoległej nad różnymi domenami
* Pozytywne: małe moduły nie niosą nieproporcjonalnego narzutu katalogowego
* Pozytywne: zasada importów (encje tak, serwisy nie) daje jasną regułę odsprzęgania modułów
* Negatywne: referencje encji między modułami (np. `Flight` → `Airport`) tworzą powiązanie na poziomie danych, które wymaga świadomego zarządzania

## Zalety i wady opcji

### Architektura horyzontalna (status quo)

Kod grupowany według roli technicznej: `routes/`, `database/entities/`, `middleware/`.

* Zaleta: znajoma struktura z tutoriali Express.js
* Zaleta: łatwe znalezienie „wszystkich routów" w jednym miejscu
* Wada: narusza Common Closure Principle — modyfikacja rejestracji użytkownika wymaga zmian w `routes/auth.ts`, `entities/User.ts`, `entities/Role.ts`, `entities/UserPreferences.ts` w trzech różnych katalogach
* Wada: katalogi `routes/` i `entities/` rosną liniowo z każdą nową funkcjonalnością
* Wada: niejawne powiązania — `routes/auth.ts` (135 linii) łączy bcrypt, JWT, trzy repozytoria TypeORM i formatowanie HTTP w jednym pliku

### Vertical Slice Architecture

Kod organizowany według domeny biznesowej, z wewnętrznymi warstwami technicznymi w każdym module.

* Zaleta: realizuje zasadę „Screaming Architecture" (Martin, 2017, rozdz. 21) — struktura komunikuje cel aplikacji
* Zaleta: spełnia Common Closure Principle — kod zmieniany z jednego powodu biznesowego żyje w jednym module
* Zaleta: wysoka kohezja wewnątrz modułów, niskie sprzężenie między nimi (Yourdon & Constantine, 1979)
* Zaleta: zgodne z wzorcem Modular Monolith, rekomendowanym przez Fowlera (2015) jako punkt wyjścia
* Zaleta: elastyczna struktura wewnętrzna — każdy moduł ma tyle warstw, ile potrzebuje
* Wada: import encji między modułami tworzy powiązanie na poziomie danych, które wymaga jasnych zasad

### Ścisłe Bounded Contexts (DDD)

Formalne konteksty ograniczone z barrel exports, kontraktami międzykontekstowymi i anti-corruption layers.

* Zaleta: maksymalne teoretyczne odsprzężenie — moduły wyodrębnialne do mikroserwisów
* Wada: narzut niewspółmierny do skali projektu dyplomowego
* Wada: relacje TypeORM (`@ManyToOne(() => Airport)`) wymagają bezpośrednich referencji do klas encji, co czyni ścisłe granice niepraktycznymi
* Wada: przedwczesna abstrakcja granic może prowadzić do złych podziałów (Fowler, 2014)

## Źródła

* Martin, R.C. (2017). *Clean Architecture*. Rozdz. 21: „Screaming Architecture"; Rozdz. 16: „Independence"
* Evans, E. (2003). *Domain-Driven Design*. Rozdz. 14: „Maintaining Model Integrity" — Bounded Context, Anti-Corruption Layer
* Fowler, M. (2002). *Patterns of Enterprise Application Architecture*. Rozdz. 1: „Layering"
* Martin, R.C. (2002). *Agile Software Development*. Common Closure Principle
* Fowler, M. (2015). „MonolithFirst". martinfowler.com
* Yourdon, E. & Constantine, L. (1979). *Structured Design* — kohezja i sprzężenie

## Powiązane ADR

* [ADR-0002](0002-backend-request-handling-layers.md) — warstwy wewnętrzne modułów
