---
status: "zaakceptowano"
date: 2026-04-25
decision-makers:
   - Piotr Zapolski
   - Mikołaj Jacoszek
   - Paweł Rachocki
---

# ADR-0004: Wybór narzędzia mapowania obiektowo-relacyjnego (ORM)

## Kontekst i opis problemu

Platforma wykorzystuje bazę danych PostgreSQL rozszerzoną o moduł PostGIS, który jest krytyczny dla wydajnego przetwarzania danych przestrzennych (telemetria wektorowa, geolokalizacja lotnisk). Zgodnie z decyzją [ADR-0003](0003-backend-domain-extraction.md), system opiera się na architekturze modularnej, co wymaga precyzyjnego zarządzania referencjami encji pomiędzy różnymi domenami.

Aplikacja backendowa implementowana jest w środowisku Node.js przy użyciu języka TypeScript w rygorystycznym trybie kontroli typów (Strict Mode). 

**Pytanie:** Jakie narzędzie należy zaimplementować, aby w sposób bezpieczny i wydajny integrować aplikację z bazą PostgreSQL/PostGIS, zachowując jednocześnie narzucony rygor architektoniczny?

## Czynniki decyzyjne

* **Kompatybilność z PostGIS:** Wymagane jest natywne wsparcie dla typów przestrzennych (`geometry`, `geography`) oraz możliwość zakładania indeksów typu `GIST` (Generalized Search Tree) bezpośrednio z poziomu definicji encji.
* **Bezpieczeństwo:** Absolutny wymóg parametryzacji wszystkich zapytań w celu eliminacji podatności na ataki typu *SQL Injection*.
* **Wsparcie dla Architektury Modularnej:** Zdolność do elastycznego mapowania relacji międzydomenowych (np. relacje pomiędzy encją `FlightTelemetry` w module `telemetry` a `Flight` w module `flights`).
* **Zarządzanie stanem bazy danych:** Wymóg generowania i uruchamiania ściśle wersjonowanych plików migracji. Zgodnie ze standardami platformy, automatyczna synchronizacja schematu bazy danych na podstawie encji jest kategorycznie zabroniona w środowiskach produkcyjnych.
* **Ekosystem TypeScript:** Wymagane jest wykorzystanie dekoratorów i pełna integracja z systemem typów w celu zapewnienia bezpieczeństwa na etapie kompilacji.

## Rozważane opcje

1. **Prisma ORM:** Bardzo popularne narzędzie o doskonałym wsparciu dla TypeScript. Odrzucone z powodu niewystarczającego, natywnego wsparcia dla zaawansowanych funkcji i indeksowania w module PostGIS (wymagałoby to nadmiernego polegania na surowych zapytaniach SQL w przypadku domeny telemetrycznej).
2. **Surowe zapytania SQL z Query Builderem (Kysely / Drizzle):** Zapewniają najwyższą wydajność i kontrolę, lecz wprowadzają duży narzut pracy przy utrzymaniu modeli międzydomenowych opisanych w ADR-0003. Nie wspierają w pełni wzorca *Data Mapper* istotnego dla izolacji warstwy logiki biznesowej.
3. **TypeORM:** Rozbudowany ORM dla TypeScript oparty na dekoratorach. Posiada natywne typy dla obsługi rozszerzeń przestrzennych PostgreSQL.

## Wynik decyzji

Wybrana opcja: **TypeORM**.

Zdecydowano się na implementację TypeORM, ponieważ jako jedyne z rozważanych narzędzi zapewnia odpowiedni balans pomiędzy ścisłym otypowaniem TypeScript, a dojrzałą integracją z rozszerzeniem PostGIS.

### Zasady i standardy implementacyjne

1. **Wykorzystanie wzorca Data Mapper:** Encje muszą być czystymi definicjami struktur danych (klasami z dekoratorami). Wszelkie operacje bazodanowe muszą być delegowane do dedykowanych Repozytoriów lub Obiektów Dostępu do Danych (DAO), aby utrzymać separację odpowiedzialności.
2. **PostGIS i Optymalizacja Przestrzenna:** Każda kolumna geometryczna musi posiadać ściśle zdefiniowany system odniesień przestrzennych (SRID: 4326) oraz jawnie zadeklarowany indeks GIST. 
   *Przykład:*
   ```typescript
   @Index({ spatial: true })
   @Column({ type: "geometry", spatialFeatureType: "Point", srid: 4326 })
   location: Point;
   ```
3. **Migracje Schematu:** Opcja `synchronize: true` w konfiguracji `AppDataSource` może być włączona wyłącznie w lokalnym środowisku deweloperskim lub izolowanych kontenerach testowych. W każdym innym przypadku modyfikacje struktury bazy danych muszą być aplikowane wyłącznie poprzez wygenerowane i zweryfikowane pliki migracji.
4. **Parametryzacja zapytań (QueryBuilder):** W przypadkach, gdy standardowe metody repozytorium są niewystarczające (np. skomplikowane operacje przecinania poligonów `ST_Intersects`), deweloperzy są zobowiązani do używania `QueryBuilder` z jawnym bindowaniem parametrów. Konkatenacja łańcuchów znaków do budowy zapytań jest zabroniona.

## Zalety i wady opcji

### TypeORM (Wybrana)

* **Zaleta:** Pełna realizacja postulatów z ADR-0003. Możliwość definiowania relacji wprost przez wstrzykiwanie typów encji z innych modułów domenowych (np. `@ManyToOne(() => Flight)`).
* **Zaleta:** Wbudowane mechanizmy do generowania migracji na podstawie różnic między kodem źródłowym a stanem bazy, co minimalizuje ryzyko błędów przy ręcznym pisaniu DDL.
* **Zaleta:** Hermetyzacja ataków SQL Injection poprzez natywną parametryzację zapytań w API repozytorium.
* **Wada:** Zauważalny narzut wydajnościowy narzucony przez mechanizm refleksji (Reflection API) i dekoratory w środowisku uruchomieniowym Node.js.
* **Wada:** Bardzo duże zbiory danych przestrzennych mogą wymagać optymalizacji, polegającej na ominięciu warstwy ORM (tzw. hydratacji obiektów) na rzecz surowych strumieni danych dla samej domeny telemetrii.

## Źródła

* Dokumentacja techniczna TypeORM (Moduły przestrzenne i relacje międzydomenowe).