---
status: "zaakceptowano"
date: 2026-03-27
decision-makers:
  - Piotr Zapolski
  - Mikołaj Jacoszek
  - Paweł Rachocki
---

# ADR-0002: Strategia architektury frontendowej

## Kontekst i opis problemu

Frontend platformy jest zbudowany z Next.js 15, React 19 i TypeScript, wykorzystując App Router. Aplikacja jest na wczesnym etapie — istnieje tylko `layout.tsx` i `page.tsx`. Wraz z rozwojem (wyszukiwanie lotów, mapa na żywo, zarządzanie użytkownikami, panel administracyjny) potrzebna jest decyzja strukturalna.

Backend stosuje vertical slices ([ADR-0001](0001-backend-modular-architecture.md)). Pytanie: czy frontend powinien odzwierciedlać tę strukturę, czy podążać za konwencjami frameworka Next.js?

## Czynniki decyzyjne

* App Router ma silne opinie o strukturze projektu — walka z frameworkiem tworzy tarcie
* Komponenty i logika specyficzne dla danej strony powinny żyć blisko tej strony (kolokacja)
* Współdzielone komponenty i utility muszą być łatwo importowalne
* Frontend jest we wczesnej fazie — nie należy nadmiernie commitować do wzorców

## Rozważane opcje

1. **Konwencje Next.js App Router** z katalogiem `common/` dla współdzielonego kodu
2. **Moduły domenowe** (odzwierciedlenie backendu) — `features/users/`, `features/flights/`
3. **Atomic Design** — atoms, molecules, organisms

## Wynik decyzji

Wybrana opcja: **„Konwencje Next.js App Router"**, ponieważ routing plikowy App Routera już zapewnia naturalne grupowanie domenowe. Katalog `app/flights/` zawiera strony związane z lotami, `app/airports/` ze stronami lotnisk — struktura routingu jest z natury wyrównana z domenami bez dodatkowej warstwy organizacyjnej.

### Zasada kolokacji: common tylko dla współdzielonego kodu

Katalog `common/` (spójne nazewnictwo z backendem) zawiera wyłącznie kod używany przez więcej niż jeden moduł/stronę. Komponenty, hooki i utility specyficzne dla jednego modułu żyją w katalogu tego modułu (np. w `app/flights/`), nie w `common/`. Przeniesienie do `common/` następuje dopiero gdy drugi moduł potrzebuje tego samego kodu.

### Zasada spłaszczania jednoelementowych katalogów

Jeśli podkatalog zawierałby tylko jeden plik, nie tworzymy katalogu — używamy pojedynczego pliku. Przykład: jeśli `common/hooks/` miałby tylko jeden hook, stosujemy `common/useAuth.tsx`. Katalog tworzymy dopiero gdy zawiera więcej niż jeden plik.

### Docelowa struktura

```
frontend/
├── app/
│   ├── layout.tsx                 # Root layout: providery, nawigacja
│   ├── page.tsx                   # Strona główna / dashboard
│   ├── globals.css
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── flights/
│   │   ├── page.tsx               # Wyszukiwanie i lista lotów
│   │   ├── [id]/page.tsx          # Szczegóły lotu z telemetrią
│   │   └── components/            # FlightCard, FlightTable — kolokacja
│   ├── airports/
│   │   ├── page.tsx               # Przeglądarka lotnisk
│   │   └── [icao]/page.tsx        # Szczegóły lotniska
│   ├── map/page.tsx               # Mapa lotów na żywo
│   ├── settings/page.tsx          # Preferencje użytkownika
│   └── admin/
│       ├── layout.tsx             # Layout admina z guardem ról
│       ├── users/page.tsx
│       └── roles/page.tsx
├── common/                         # tylko kod współdzielony przez >1 moduł
│   ├── api/                       # Typowane funkcje klienta API
│   ├── hooks/                     # useAuth, useDebounce (współdzielone hooki)
│   ├── components/                # Button, Input, Card (współdzielone prymitywy UI)
│   ├── utils/                     # Formattery, walidatory, stałe
│   └── types/                     # Współdzielone definicje typów TypeScript
└── public/
```

### Konsekwencje

* Pozytywne: struktura zgodna z oficjalną dokumentacją Next.js
* Pozytywne: Server Components, streaming i inne funkcje App Router działają bez obejść
* Pozytywne: routing plikowy zapewnia grupowanie domenowe widoczne w kodzie i URL
* Pozytywne: `common/` nie rośnie niekontrolowanie — kod trafia tam tylko gdy jest naprawdę współdzielony
* Pozytywne: spójne nazewnictwo `common/` z backendem ułatwia nawigację między projektami

## Zalety i wady opcji

### Konwencje Next.js App Router

* Zaleta: routing plikowy **już zapewnia grupowanie domenowe** — `app/flights/` to strony lotów
* Zaleta: kolokacja jest koncepcją pierwszorzędną w App Router
* Zaleta: zasada najmniejszego zaskoczenia — każdy developer Next.js od razu rozumie strukturę
* Zaleta: zgodne z YAGNI — frontend jest na wczesnym etapie
* Wada: brak jawnych granic „modułu funkcjonalności"

### Moduły domenowe (odzwierciedlenie backendu)

```
features/flights/components/, features/flights/hooks/, features/flights/api/
```

* Zaleta: lustrzane odbicie vertical slices backendu
* Wada: walczy z konwencjami App Router — pliki w `app/` stają się cienkimi wrapperami importującymi z `features/`
* Wada: tworzy równoległą hierarchię duplikującą naturalną strukturę routera
* Wada: Server Components trudniejsze w użyciu z zewnętrznymi modułami

### Atomic Design

Komponenty organizowane według granulacji: atoms, molecules, organisms, templates.

* Zaleta: systematyczna taksonomia komponentów
* Wada: subiektywna klasyfikacja (SearchBar to molecule czy organism?) dodaje narzut kognitywny
* Wada: nie adresuje organizacji stron/routingu
* Wada: ortogonalne do konwencji Next.js

## Źródła

* Next.js Documentation (2024). „Project Organization and File Colocation"
* Fowler, M. (2014). „SacrificialArchitecture". martinfowler.com
* Martin, R.C. (2017). *Clean Architecture*. Rozdz. 34 (Simon Brown) — struktury wyrównane z frameworkiem
* Beck, K. (1999). *Extreme Programming Explained*. YAGNI
* Frost, B. (2016). *Atomic Design*. atomicdesign.bradfrost.com

## Powiązane ADR

* [ADR-0001](0001-backend-modular-architecture.md) — vertical slices backendu, które inspirowały rozważanie podejścia domenowego
