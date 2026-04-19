"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  Airport,
  getAirportByCode,
  searchAirports,
} from "@/common/api/airports";

export default function AirportsPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Airport[]>([]);
  const [selected, setSelected] = useState<Airport | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults([]);
      setError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      setError(null);
      try {
        const data = await searchAirports(term);
        setResults(data);
      } catch (err) {
        console.error(err);
        setError("Nie udało się przeszukać lotnisk.");
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  async function loadByExactCode(code: string) {
    setDetailLoading(true);
    setError(null);
    setInfo(null);
    try {
      const airport = await getAirportByCode(code);
      setSelected(airport);
      const wasInResults = results.some(
        (r) => r.icaoCode.toUpperCase() === airport.icaoCode.toUpperCase(),
      );
      if (!wasInResults) {
        setInfo("Lotnisko zostało dociągnięte z AeroAPI i zapisane w bazie.");
      }
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setError(
          `Nie znaleziono lotniska "${code}" ani w bazie, ani w AeroAPI.`,
        );
      } else {
        setError("Nie udało się pobrać szczegółów lotniska.");
      }
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  }

  function handleManualLookup(e: React.FormEvent) {
    e.preventDefault();
    const code = query.trim();
    if (code) loadByExactCode(code);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Lotniska</h1>
        <p className="text-gray-600 mb-8">
          Wpisz nazwę lub kod ICAO/IATA. Jeśli dany kod nie znajduje się w
          bazie, użyj przycisku{" "}
          <span className="font-medium">Pobierz dokładny kod</span> — backend
          spróbuje dociągnąć dane z AeroAPI.
        </p>

        <form onSubmit={handleManualLookup} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="np. EPWA, WAW lub Warsaw"
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!query.trim() || detailLoading}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {detailLoading ? "Pobieram…" : "Pobierz dokładny kod"}
            </button>
          </div>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}
        {info && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 mb-4 text-sm">
            {info}
          </div>
        )}

        <section className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Wyniki wyszukiwania{searchLoading ? " (ładowanie…)" : ""}
          </h2>
          {results.length === 0 && !searchLoading && (
            <p className="text-sm text-gray-500">
              {query.trim()
                ? "Brak wyników w lokalnej bazie."
                : "Wpisz frazę, aby wyszukać."}
            </p>
          )}
          <ul className="divide-y divide-gray-100">
            {results.map((airport) => (
              <li key={airport.icaoCode}>
                <button
                  onClick={() => loadByExactCode(airport.icaoCode)}
                  className="w-full text-left py-2 px-1 hover:bg-gray-50 rounded transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-800">
                      {airport.name}
                    </span>
                    <span className="text-xs font-mono text-gray-500">
                      {airport.icaoCode}
                      {airport.iataCode && ` / ${airport.iataCode}`}
                    </span>
                  </div>
                  {airport.city && (
                    <div className="text-xs text-gray-500">
                      {airport.city.name}
                      {airport.city.countryName &&
                        `, ${airport.city.countryName}`}
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>

        {selected && (
          <section className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Szczegóły
            </h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-gray-500">Nazwa</dt>
              <dd className="text-gray-800">{selected.name}</dd>
              <dt className="text-gray-500">ICAO</dt>
              <dd className="font-mono text-gray-800">{selected.icaoCode}</dd>
              <dt className="text-gray-500">IATA</dt>
              <dd className="font-mono text-gray-800">
                {selected.iataCode ?? "—"}
              </dd>
              <dt className="text-gray-500">Miasto</dt>
              <dd className="text-gray-800">
                {selected.city
                  ? `${selected.city.name}${selected.city.countryName ? `, ${selected.city.countryName}` : ""}`
                  : "—"}
              </dd>
              <dt className="text-gray-500">Kraj (ISO)</dt>
              <dd className="font-mono text-gray-800">
                {selected.city?.countryCode ?? "—"}
              </dd>
              <dt className="text-gray-500">Współrzędne</dt>
              <dd className="font-mono text-gray-800">
                {selected.latitude.toFixed(4)}, {selected.longitude.toFixed(4)}
              </dd>
              <dt className="text-gray-500">Strefa czasowa</dt>
              <dd className="text-gray-800">{selected.timezone}</dd>
            </dl>
          </section>
        )}
      </div>
    </main>
  );
}
