'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

interface WelcomeData {
  message: string;
  database: string;
  version?: string;
}

export default function Home() {
  const [data, setData] = useState<WelcomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
        const response = await axios.get<WelcomeData>(
          `${apiUrl}/welcome`
        );
        setData(response.data);
      } catch (err) {
        setError('Nie udało się połączyć z backendem');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              ✈️ Platforma zarządzania i analizy lotów
            </h1>
            <p className="text-xl text-gray-600">
              Zaawansowany system monitorowania i analizy operacji lotniczych
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              Status systemu
            </h2>
            
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800">❌ {error}</p>
              </div>
            )}

            {data && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium">
                    ✅ {data.message}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-600 font-medium mb-1">
                      Frontend
                    </p>
                    <p className="text-blue-900">Next.js + React + Tailwind</p>
                  </div>
                  
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="text-sm text-purple-600 font-medium mb-1">
                      Backend
                    </p>
                    <p className="text-purple-900">TypeScript + Express</p>
                  </div>
                  
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 md:col-span-2">
                    <p className="text-sm text-indigo-600 font-medium mb-1">
                      Baza danych
                    </p>
                    <p className="text-indigo-900 text-sm break-all">
                      {data.database}
                      {data.version && ` - ${data.version.substring(0, 50)}...`}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-xl p-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              Stack technologiczny
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['Next.js 15', 'React 19', 'TypeScript', 'Tailwind CSS', 
                'Express', 'PostgreSQL', 'Docker', 'Node.js'].map((tech) => (
                <div
                  key={tech}
                  className="bg-gray-50 rounded-lg p-4 text-center hover:bg-gray-100 transition"
                >
                  <p className="text-gray-800 font-medium">{tech}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
