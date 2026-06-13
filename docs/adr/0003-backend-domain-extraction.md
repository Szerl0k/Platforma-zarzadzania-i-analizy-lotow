---
status: "zaakceptowano"
date: 2026-04-14
decision-makers:
  - Piotr Zapolski
  - Mikołaj Jacoszek
  - Paweł Rachocki
---

# ADR-0003: Wydzielenie nowych kontekstów domenowych (Telemetry, Tracking) z modułu Flights

## Kontekst i opis problemu

Zgodnie z ustaleniami z [ADR-0001](0001-backend-modular-architecture.md), backend został zorganizowany w oparciu o *Vertical Slice Architecture* z podziałem na domeny. Z czasem moduł `flights` stał się zbyt duży (tzw. antywzorzec *God Module*), przyjmując na siebie odpowiedzialność za niezwiązane ze sobą spójnie procesy biznesowe. 

W jednym module znalazły się:
1. Komercyjne dane operacyjne lotów i rozkłady (encje `Flight`, `FlightStatus`, `FlightCodeshare`).
2. Wysokoczęstotliwościowe dane przestrzenne / telemetria (encja `FlightTelemetry`).
3. Preferencje i historia użytkowników powiązane z lotami (encje `FlightHistory`, `TrackedFlight`, `FavouriteDestination`).

Łączenie logiki ścisłych operacji lotniczych, zachowań użytkowników aplikacji (Client-facing features) oraz przetwarzania wektorów stanu przestrzennego (PostGIS) w jednym *Bounded Context* drastycznie obniżało kohezję (spójność) modułu i utrudniało ewentualne przyszłe skalowanie wybranych komponentów (np. telemetrii).

**Pytanie:** W jaki sposób zredefiniować granice domen (*Bounded Contexts*), aby zachować wysoką kohezję, rozdzielić dane o różnej charakterystyce obciążeniowej i oddzielić operacyjne dane lotnicze od interakcji użytkownika?

## Czynniki decyzyjne

* **Zasada jednej odpowiedzialności (Single Responsibility Principle) na poziomie architektury:** Każdy moduł powinien odpowiadać za jedną, spójną gałąź biznesową.
* **Charakterystyka obciążenia:** Telemetria wymaga intensywnych operacji zapisu i zapytań przestrzennych (PostGIS), co drastycznie różni się od charakterystyki odczytu danych operacyjnych o lotach (AeroAPI).
* **Separacja logiki użytkownika:** Preferencje użytkownika (ulubione lotniska, śledzone loty) nie są częścią domeny zarządzania komercyjnym lotem.
* **Skalowalność i utrzymanie:** Zapobieganie powstaniu monolitycznego katalogu z dziesiątkami niezwiązanych ze sobą serwisów i encji.

## Rozważane opcje

1. **Status quo (Brak zmian)** — utrzymanie wszystkich funkcji jako sub-domen w gigantycznym module `flights`.
2. **Podział na dwa moduły (Core Flights vs User Activity)** — wydzielenie tylko funkcji użytkownika do nowego modułu, przy zachowaniu telemetrii w module lotów.
3. **Pełna separacja na dedykowane Bounded Contexts** — precyzyjne wydzielenie dwóch nowych modułów: `telemetry`, `tracking`, przy pozostawieniu w `flights` wyłącznie danych operacyjnych.

## Wynik decyzji

Wybrana opcja: **„Pełna separacja na dedykowane Bounded Contexts" (Opcja 3)**. 

Odchudziliśmy moduł `flights`, przenosząc wybrane encje i dedykowaną im logikę biznesową do nowo utworzonych modułów, definiując tym samym nowe granice domenowe.

### Nowy podział odpowiedzialności

1. **`flights/` (Domenowa operacyjna / Flight Operations)**
   * Odpowiedzialność: Autorytatywne dane o lotach, statusy, rozkłady, opóźnienia, kody codeshare. 
   * Pozostałe encje: `Flight`, `FlightStatus`, `FlightCodeshare`.
2. **`telemetry/` (Domena śledzenia przestrzennego / Spatial Tracking)**
   * Odpowiedzialność: Przetwarzanie i przechowywanie wektorów stanu w czasie rzeczywistym, wykorzystanie indeksowania GIST i danych geometrycznych (PostGIS).
   * Przeniesione encje: `FlightTelemetry`.
3. **`tracking/` (Domena interakcji użytkownika z lotami)**
   * Odpowiedzialność: Historia lotów użytkownika, aktywne śledzenie konkretnych rejsów, ulubione destynacje.
   * Przeniesione encje: `FlightHistory`, `TrackedFlight`, `TrackingSource`, `TrackingStatus`, `FavouriteDestination`.

### Zasady powiązań między modułami

Zgodnie z ustaleniami z ADR-0001, referencje na poziomie bazy danych w TypeORM (`@ManyToOne`, `@OneToMany`) są utrzymywane za pomocą bezpośrednich importów klas encji z innych modułów.
* Przykład: `FlightTelemetry` (w `telemetry`) importuje encję `Flight` (z `flights`).
* Przykład: `TrackedFlight` (w `tracking`) importuje encję `User` (z `users`) oraz `Flight` (z `flights`).

Na poziomie logiki biznesowej, serwisy poszczególnych modułów komunikują się wyłącznie za pomocą wstrzykiwanych interfejsów, zapytań do repozytoriów, lub adapterów z katalogu `common/integrations/`.

### Zaktualizowana docelowa struktura (wycinek)

```text
backend/src/
├── flights/                       # Odchudzony moduł operacji lotniczych
│   ├── entities/          
│   ├── routes/
│   └── services/
│
├── telemetry/                     # Nowy moduł przestrzenny (PostGIS)
│   ├── entities/          
│   ├── telemetry.routes.ts
│   └── telemetry.service.ts
│
├── tracking/                      # Nowy moduł interakcji i preferencji użytkownika
│   ├── entities/          
│   ├── routes/
│   └── services/
│
├── geo/                           # Bez zmian
│   ├── entities/          
│   ├── geo.routes.ts
│   └── geo.service.ts
```

## Zalety i wady opcji

### Pełna separacja na dedykowane Bounded Contexts (Wybrana)

* **Zaleta:** Bardzo wysoka kohezja (spójność) — kod zmieniający logikę rysowania telemetrii nie dotyka w żaden sposób kodu odpowiedzialnego za rozkłady lotów komercyjnych.
* **Zaleta:** Izolacja technologiczna — ułatwione zarządzanie optymalizacjami PostGIS i indeksami GIST wyłącznie w obrębie mniejszego modułu `telemetry`.
* **Zaleta:** Naturalne mapowanie na język wszechobecny (Ubiquitous Language) i odizolowanie logiki skupionej na użytkowniku (User-Centric) od logiki lotniczej (Aviation-Centric).
* **Wada:** Zwiększona liczba modułów do nawigowania w IDE.
* **Wada:** Większa sieć powiązań między-modułowych na poziomie relacji ORM (konieczność uważnego nadzorowania kluczy obcych).

## Źródła

* Evans, E. (2003). *Domain-Driven Design*. Rozdziały o Bounded Contexts.
* Vernon, V. (2013). *Implementing Domain-Driven Design*. Wydzielanie modułów i granic kohezji.

## Powiązane ADR

* ADR-0001 — Architektura modularna backendu (decyzja pierwotna, którą ten ADR uszczegóławia i rozszerza).