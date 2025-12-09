// ============================================
// ALUMNO PAGE
// Página principal del alumno para escanear QR
// ============================================

import React, { useState } from 'react';
import { QRScanner } from '../components/qr/QRScanner';
import { useAuthStore } from '../store/auth-store';

type ViewMode = 'scanner' | 'history' | 'success';

interface AttendanceHistory {
  id: string;
  date: string;
  subject: string;
  course: string;
  status: 'PRESENTE' | 'TARDANZA' | 'AUSENTE';
  time: string;
}

// Mock data
const mockHistory: AttendanceHistory[] = [
  {
    id: '1',
    date: 'Hoy',
    subject: 'Matemáticas',
    course: '3ro A',
    status: 'PRESENTE',
    time: '08:05',
  },
  {
    id: '2',
    date: 'Ayer',
    subject: 'Física',
    course: '3ro A',
    status: 'TARDANZA',
    time: '09:20',
  },
  {
    id: '3',
    date: 'Ayer',
    subject: 'Química',
    course: '3ro A',
    status: 'PRESENTE',
    time: '10:02',
  },
];

export const AlumnoPage: React.FC = () => {
  const { user } = useAuthStore();
  const [viewMode, setViewMode] = useState<ViewMode>('scanner');

  const handleScanSuccess = () => {
    setViewMode('success');
    // Volver al scanner después de 3 segundos
    setTimeout(() => setViewMode('scanner'), 3000);
  };

  const handleScanError = (error: string) => {
    console.error('Error en escaneo:', error);
  };

  // Vista de éxito
  if (viewMode === 'success') {
    return (
      <div className="min-h-screen bg-green-500 flex flex-col items-center justify-center p-8">
        <svg
          className="w-32 h-32 text-white mb-6 animate-bounce"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        <h1 className="text-4xl font-bold text-white mb-2">¡Listo!</h1>
        <p className="text-white/90 text-xl">Asistencia registrada</p>
      </div>
    );
  }

  // Vista de historial
  if (viewMode === 'history') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-4">
        <header className="flex items-center justify-between mb-6">
          <button
            onClick={() => setViewMode('scanner')}
            className="p-2 text-white hover:bg-white/10 rounded-lg"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-white">Mi Asistencia</h1>
          <div className="w-10" />
        </header>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-green-500/20 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-400">28</p>
            <p className="text-xs text-gray-400">Presentes</p>
          </div>
          <div className="bg-yellow-500/20 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">2</p>
            <p className="text-xs text-gray-400">Tardanzas</p>
          </div>
          <div className="bg-red-500/20 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-400">1</p>
            <p className="text-xs text-gray-400">Ausencias</p>
          </div>
        </div>

        {/* History List */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <h2 className="text-lg font-semibold text-white mb-4">
            Historial Reciente
          </h2>
          <div className="space-y-3">
            {mockHistory.map((record) => (
              <div
                key={record.id}
                className="flex items-center gap-3 bg-white/5 p-3 rounded-xl"
              >
                <div
                  className={`w-3 h-3 rounded-full ${
                    record.status === 'PRESENTE'
                      ? 'bg-green-500'
                      : record.status === 'TARDANZA'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                />
                <div className="flex-1">
                  <p className="text-white font-medium">{record.subject}</p>
                  <p className="text-gray-400 text-sm">
                    {record.date} • {record.time}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    record.status === 'PRESENTE'
                      ? 'bg-green-500/20 text-green-400'
                      : record.status === 'TARDANZA'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {record.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Vista principal - Scanner
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
      {/* Scanner */}
      <QRScanner
        userId={user?.id || 'mock-user'}
        studentName={`${user?.firstName || 'Alumno'} ${user?.lastName || ''}`}
        onSuccess={handleScanSuccess}
        onError={handleScanError}
      />

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-white/10 px-4 py-2 safe-area-pb">
        <div className="flex justify-around">
          <button
            onClick={() => setViewMode('scanner')}
            className="flex flex-col items-center py-2 px-4 text-indigo-400"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
              />
            </svg>
            <span className="text-xs mt-1">Escanear</span>
          </button>

          <button
            onClick={() => setViewMode('history')}
            className="flex flex-col items-center py-2 px-4 text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
            <span className="text-xs mt-1">Historial</span>
          </button>

          <button className="flex flex-col items-center py-2 px-4 text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span className="text-xs mt-1">Perfil</span>
          </button>
        </div>
      </nav>

      {/* Safe area padding for iOS */}
      <style>{`
        .safe-area-pb {
          padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  );
};

export default AlumnoPage;
