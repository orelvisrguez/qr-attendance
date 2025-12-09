// ============================================
// LIVE FEED COMPONENT
// Componente de lista de asistentes en tiempo real
// ============================================

import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { AttendanceRecord, AttendanceStatus } from '../../types';

interface LiveFeedProps {
  attendees: AttendanceRecord[];
  totalStudents?: number;
  showStats?: boolean;
  maxHeight?: string;
}

const statusConfig: Record<AttendanceStatus, { color: string; bg: string; label: string }> = {
  PRESENTE: { color: 'text-green-400', bg: 'bg-green-500/20', label: 'Presente' },
  TARDANZA: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Tardanza' },
  AUSENTE: { color: 'text-red-400', bg: 'bg-red-500/20', label: 'Ausente' },
  JUSTIFICADO: { color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Justificado' },
};

export const LiveFeed: React.FC<LiveFeedProps> = ({
  attendees,
  totalStudents = 0,
  showStats = true,
  maxHeight = '500px',
}) => {
  // Ordenar por hora de escaneo (más reciente primero)
  const sortedAttendees = useMemo(() => {
    return [...attendees].sort(
      (a, b) =>
        new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()
    );
  }, [attendees]);

  // Estadísticas
  const stats = useMemo(() => {
    const presente = attendees.filter((a) => a.status === 'PRESENTE').length;
    const tardanza = attendees.filter((a) => a.status === 'TARDANZA').length;
    const total = attendees.length;
    const porcentaje = totalStudents > 0 ? Math.round((total / totalStudents) * 100) : 0;

    return { presente, tardanza, total, porcentaje };
  }, [attendees, totalStudents]);

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
            </span>
            Asistencia en Vivo
          </h2>
          <span className="text-2xl font-bold text-white">
            {stats.total}
            {totalStudents > 0 && (
              <span className="text-sm font-normal text-gray-400">
                /{totalStudents}
              </span>
            )}
          </span>
        </div>

        {/* Stats Bar */}
        {showStats && totalStudents > 0 && (
          <div className="mt-3">
            {/* Progress bar */}
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${stats.porcentaje}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-400">
              <span>{stats.porcentaje}% presente</span>
              <span>{totalStudents - stats.total} pendientes</span>
            </div>
          </div>
        )}
      </div>

      {/* Attendee List */}
      <div
        className="overflow-y-auto p-4 space-y-2"
        style={{ maxHeight }}
      >
        {sortedAttendees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <svg
              className="w-16 h-16 mb-4 opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p className="text-lg font-medium">Esperando alumnos...</p>
            <p className="text-sm mt-1">
              Los registros aparecerán aquí en tiempo real
            </p>
          </div>
        ) : (
          sortedAttendees.map((record, index) => {
            const config = statusConfig[record.status];
            const isNew = index === 0;

            return (
              <div
                key={record.id}
                className={`
                  flex items-center gap-3 p-3 rounded-xl transition-all
                  ${isNew ? 'bg-white/10 animate-pulse-once' : 'bg-white/5'}
                  hover:bg-white/10
                `}
              >
                {/* Avatar */}
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                    {record.student?.firstName?.[0] || '?'}
                    {record.student?.lastName?.[0] || '?'}
                  </div>
                  {isNew && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900 animate-ping" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">
                    {record.student?.firstName} {record.student?.lastName}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {format(new Date(record.scannedAt), "HH:mm:ss", {
                      locale: es,
                    })}
                  </p>
                </div>

                {/* Status Badge */}
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}
                >
                  {config.label}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Stats */}
      {showStats && attendees.length > 0 && (
        <div className="p-4 border-t border-white/10 flex gap-4">
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold text-green-400">{stats.presente}</p>
            <p className="text-xs text-gray-400">Presentes</p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold text-yellow-400">{stats.tardanza}</p>
            <p className="text-xs text-gray-400">Tardanzas</p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold text-red-400">
              {totalStudents - stats.total}
            </p>
            <p className="text-xs text-gray-400">Ausentes</p>
          </div>
        </div>
      )}

      {/* Animation styles */}
      <style>{`
        @keyframes pulse-once {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .animate-pulse-once {
          animation: pulse-once 1s ease-in-out 2;
        }
      `}</style>
    </div>
  );
};

export default LiveFeed;
