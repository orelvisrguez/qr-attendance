// ============================================
// QR PROJECTOR COMPONENT
// Proyector QR con tokens HMAC seguros
// ============================================

import React, { useEffect, useState, useCallback, useRef } from 'react';
import QRCode from 'qrcode';
import { supabase } from '../../lib/supabase';
import { API_URL } from '../../lib/api';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface QRProjectorProps {
  sessionId: string;
  sessionSecret: string;
  courseName: string;
  subjectName: string;
  profesorName: string;
  qrRotationSeconds?: number;
  isPaused?: boolean;
}

interface AttendeeRecord {
  id: string;
  studentId: string;
  studentName: string;
  scannedAt: string;
  status: string;
}

interface QRPayload {
  s: string; // sessionId
  t: string; // token (HMAC)
  n: string; // nonce
  e: number; // expiresAt
}

// Generar nonce único anti-replay
function generateNonce(): string {
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// Generar token HMAC usando el secreto de la sesión
async function generateHMACToken(secret: string, nonce: string, expiresAt: number): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${nonce}:${expiresAt}`);
  const keyData = encoder.encode(secret);

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, data);
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  } catch (err) {
    // Fallback for environments without crypto.subtle
    console.warn('crypto.subtle not available, using fallback');
    const combined = `${secret}:${nonce}:${expiresAt}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0').substring(0, 16);
  }
}

export const QRProjector: React.FC<QRProjectorProps> = ({
  sessionId,
  sessionSecret,
  courseName,
  subjectName,
  profesorName,
  qrRotationSeconds = 7,
  isPaused = false,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isActive, setIsActive] = useState(false);
  const [countdown, setCountdown] = useState(qrRotationSeconds);
  const [attendees, setAttendees] = useState<AttendeeRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentToken, setCurrentToken] = useState<string>('');
  const [totalStudents, setTotalStudents] = useState<number>(0);

  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const rotationRef = useRef<NodeJS.Timeout | null>(null);
  const qrChannelRef = useRef<RealtimeChannel | null>(null);
  const attendanceChannelRef = useRef<RealtimeChannel | null>(null);

  const ROTATION_INTERVAL = qrRotationSeconds;
  const VALIDATION_WINDOW = 10; // segundos

  // Generar imagen QR desde payload
  const generateQRImage = useCallback(async (payload: QRPayload) => {
    try {
      const qrContent = JSON.stringify(payload);

      const dataUrl = await QRCode.toDataURL(qrContent, {
        width: 400,
        margin: 2,
        color: {
          dark: '#1a1a2e',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      });

      setQrDataUrl(dataUrl);
      setCurrentToken(payload.t.substring(0, 8) + '...');
    } catch (err) {
      console.error('Error generando QR:', err);
      setError('Error generando código QR');
    }
  }, []);

  // Generar nuevo QR con HMAC token
  const generateAndBroadcastQR = useCallback(async () => {
    if (isPaused) return;

    const nonce = generateNonce();
    const timestamp = Date.now();
    const expiresAt = timestamp + VALIDATION_WINDOW * 1000;

    // Generar token HMAC seguro
    const token = await generateHMACToken(sessionSecret, nonce, expiresAt);

    const payload: QRPayload = {
      s: sessionId,
      t: token,
      n: nonce,
      e: expiresAt,
    };

    // Generar QR localmente
    await generateQRImage(payload);
    setCountdown(ROTATION_INTERVAL);

    // Broadcast via Supabase Realtime (opcional, para sincronización)
    if (qrChannelRef.current) {
      await qrChannelRef.current.send({
        type: 'broadcast',
        event: 'qr-update',
        payload: {
          sessionId,
          token: token.substring(0, 8),
          expiresAt,
        },
      });
    }
  }, [sessionId, sessionSecret, isPaused, generateQRImage, ROTATION_INTERVAL, VALIDATION_WINDOW]);

  // Cargar asistencias existentes al iniciar
  const loadExistingAttendees = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/attendance?sessionId=${sessionId}`);
      const data = await response.json();

      if (data.success && data.data) {
        setAttendees(data.data.map((a: any) => ({
          id: a.id,
          studentId: a.studentId,
          studentName: a.studentName,
          scannedAt: a.scannedAt,
          status: a.status,
        })));
      }
    } catch (err) {
      console.error('Error loading attendees:', err);
    }
  }, [sessionId]);

  // Inicializar canales de Supabase
  useEffect(() => {
    // Canal para broadcasting QR
    const qrChannel = supabase.channel(`qr-session-${sessionId}`, {
      config: {
        broadcast: { self: false },
      },
    });

    qrChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        setError(null);
        console.log('QR Channel connected');
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        setIsConnected(false);
      }
    });

    qrChannelRef.current = qrChannel;

    // Canal para recibir notificaciones de asistencia
    const attendanceChannel = supabase.channel(`attendance-${sessionId}`, {
      config: {
        broadcast: { self: true },
      },
    });

    attendanceChannel
      .on('broadcast', { event: 'attendance-registered' }, ({ payload }) => {
        const newRecord: AttendeeRecord = {
          id: payload.id || Date.now().toString(),
          studentId: payload.studentId,
          studentName: payload.studentName || 'Estudiante',
          scannedAt: payload.scannedAt || new Date().toISOString(),
          status: payload.status || 'PRESENTE',
        };

        setAttendees((prev) => {
          // Evitar duplicados
          if (prev.some((a) => a.studentId === newRecord.studentId)) {
            return prev;
          }
          return [newRecord, ...prev];
        });
      })
      .subscribe();

    attendanceChannelRef.current = attendanceChannel;

    // Cargar asistencias existentes
    loadExistingAttendees();

    return () => {
      if (qrChannelRef.current) {
        supabase.removeChannel(qrChannelRef.current);
      }
      if (attendanceChannelRef.current) {
        supabase.removeChannel(attendanceChannelRef.current);
      }
    };
  }, [sessionId, loadExistingAttendees]);

  // Manejar pausa
  useEffect(() => {
    if (isPaused && isActive) {
      // Pausar rotación
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (rotationRef.current) clearInterval(rotationRef.current);
    } else if (!isPaused && isActive) {
      // Reanudar rotación
      generateAndBroadcastQR();

      rotationRef.current = setInterval(() => {
        generateAndBroadcastQR();
      }, ROTATION_INTERVAL * 1000);

      countdownRef.current = setInterval(() => {
        setCountdown((prev) => (prev <= 1 ? ROTATION_INTERVAL : prev - 1));
      }, 1000);
    }
  }, [isPaused, isActive, generateAndBroadcastQR, ROTATION_INTERVAL]);

  // Iniciar/Detener proyección
  const toggleProjection = useCallback(() => {
    if (isActive) {
      setIsActive(false);
      setQrDataUrl('');
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (rotationRef.current) clearInterval(rotationRef.current);
    } else {
      setIsActive(true);
      generateAndBroadcastQR();

      rotationRef.current = setInterval(() => {
        generateAndBroadcastQR();
      }, ROTATION_INTERVAL * 1000);

      countdownRef.current = setInterval(() => {
        setCountdown((prev) => (prev <= 1 ? ROTATION_INTERVAL : prev - 1));
      }, 1000);
    }
  }, [isActive, generateAndBroadcastQR, ROTATION_INTERVAL]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (rotationRef.current) clearInterval(rotationRef.current);
    };
  }, []);

  // Auto-start projection
  useEffect(() => {
    if (isConnected && !isActive && !isPaused) {
      toggleProjection();
    }
  }, [isConnected]);

  const countdownProgress = ((ROTATION_INTERVAL - countdown) / ROTATION_INTERVAL) * 100;

  // Estadísticas
  const presentCount = attendees.filter(a => a.status === 'PRESENTE').length;
  const lateCount = attendees.filter(a => a.status === 'TARDANZA').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {subjectName}
              </h1>
              <p className="text-purple-300">
                {courseName} • Prof. {profesorName}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Estado de conexión */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                  }`}
                />
                <span className="text-sm text-gray-300">
                  {isConnected ? 'Conectado' : 'Conectando...'}
                </span>
              </div>

              {/* Estado de pausa */}
              {isPaused && (
                <div className="px-4 py-2 bg-yellow-500/20 border border-yellow-500 rounded-lg">
                  <span className="text-yellow-300 font-medium">PAUSADO</span>
                </div>
              )}

              {/* Contadores */}
              <div className="flex gap-2">
                <div className="bg-green-500/20 px-4 py-2 rounded-lg">
                  <span className="text-2xl font-bold text-green-400">{presentCount}</span>
                  <span className="text-sm text-green-300 ml-2">presentes</span>
                </div>
                {lateCount > 0 && (
                  <div className="bg-amber-500/20 px-4 py-2 rounded-lg">
                    <span className="text-2xl font-bold text-amber-400">{lateCount}</span>
                    <span className="text-sm text-amber-300 ml-2">tardanzas</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* QR Code Section */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
              <div className="flex flex-col items-center">
                {isActive && qrDataUrl && !isPaused ? (
                  <>
                    {/* QR Image */}
                    <div className="relative">
                      <div className="bg-white p-6 rounded-2xl shadow-2xl">
                        <img
                          src={qrDataUrl}
                          alt="Código QR de Asistencia"
                          className="w-80 h-80"
                        />
                      </div>

                      {/* Countdown Ring */}
                      <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
                        <div className="relative w-16 h-16">
                          <svg className="w-16 h-16 transform -rotate-90">
                            <circle
                              cx="32"
                              cy="32"
                              r="28"
                              stroke="rgba(255,255,255,0.2)"
                              strokeWidth="4"
                              fill="none"
                            />
                            <circle
                              cx="32"
                              cy="32"
                              r="28"
                              stroke="#a855f7"
                              strokeWidth="4"
                              fill="none"
                              strokeDasharray={`${(countdownProgress / 100) * 176} 176`}
                              className="transition-all duration-1000"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-xl">
                            {countdown}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Token Info */}
                    <div className="mt-8 text-center">
                      <p className="text-gray-500 text-xs">Token HMAC</p>
                      <p className="text-purple-400 font-mono text-sm">{currentToken}</p>
                    </div>

                    <p className="mt-4 text-gray-300 text-center">
                      El código se actualiza cada {ROTATION_INTERVAL} segundos
                    </p>
                  </>
                ) : isPaused ? (
                  <div className="flex flex-col items-center justify-center h-96">
                    <div className="w-24 h-24 rounded-full bg-yellow-500/20 flex items-center justify-center mb-4">
                      <svg className="w-12 h-12 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-yellow-300 text-xl font-semibold">Proyección Pausada</p>
                    <p className="text-gray-400 mt-2">Presiona Reanudar para continuar</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-96">
                    <svg
                      className="w-24 h-24 text-gray-500 mb-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                      />
                    </svg>
                    <p className="text-gray-400 text-lg">
                      Esperando conexión...
                    </p>
                  </div>
                )}

                {/* Toggle Button */}
                {!isPaused && (
                  <button
                    onClick={toggleProjection}
                    disabled={!isConnected}
                    className={`mt-8 px-8 py-4 rounded-xl font-semibold text-lg transition-all ${
                      isActive
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-purple-500 hover:bg-purple-600 text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isActive ? 'Detener Proyección' : 'Iniciar Proyección'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Live Feed Section */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 h-full">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Asistencia en Vivo
              </h2>

              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {attendees.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">
                    Esperando escaneos...
                  </p>
                ) : (
                  attendees.map((record, index) => (
                    <div
                      key={record.id}
                      className="flex items-center gap-3 bg-white/5 p-3 rounded-lg animate-fade-in"
                      style={{
                        animationDelay: `${index * 50}ms`,
                      }}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                        record.status === 'TARDANZA' ? 'bg-amber-500' : 'bg-purple-500'
                      }`}>
                        {record.studentName?.[0] || 'E'}
                      </div>

                      <div className="flex-1">
                        <p className="text-white font-medium">
                          {record.studentName}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {new Date(record.scannedAt).toLocaleTimeString()}
                        </p>
                      </div>

                      <span className={`px-2 py-1 text-xs rounded-full ${
                        record.status === 'TARDANZA'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        {record.status}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Resumen */}
              {attendees.length > 0 && (
                <div className="mt-6 pt-4 border-t border-white/10">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Total registrados:</span>
                    <span className="text-white font-semibold">{attendees.length}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default QRProjector;
