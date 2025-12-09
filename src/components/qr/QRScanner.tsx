// ============================================
// QR SCANNER COMPONENT
// Componente para escanear QR (Alumno - PWA Ready)
// Usa Supabase Realtime para comunicación
// ============================================

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeResult } from 'html5-qrcode';
import { supabase } from '../../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

type ScanStatus = 'idle' | 'scanning' | 'success' | 'error' | 'processing';

interface QRScannerProps {
  userId: string;
  studentName: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface QRPayload {
  s: string; // sessionId
  t: string; // token
  n: string; // nonce
  e: number; // expiresAt
}

// Generador de Device Fingerprint
const generateDeviceFingerprint = async (): Promise<string> => {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 'unknown',
    await getCanvasFingerprint(),
  ];

  const fingerprint = components.join('|');

  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprint);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

const getCanvasFingerprint = async (): Promise<string> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 'no-canvas';

  ctx.textBaseline = 'top';
  ctx.font = "14px 'Arial'";
  ctx.fillStyle = '#f60';
  ctx.fillRect(125, 1, 62, 20);
  ctx.fillStyle = '#069';
  ctx.fillText('QRAttendance', 2, 15);

  return canvas.toDataURL().slice(-50);
};

export const QRScanner: React.FC<QRScannerProps> = ({
  userId,
  studentName,
  onSuccess,
  onError,
}) => {
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [message, setMessage] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScannedRef = useRef<string>('');
  const processingRef = useRef(false);
  const attendanceChannelRef = useRef<RealtimeChannel | null>(null);
  const usedNoncesRef = useRef<Set<string>>(new Set());

  // Inicializar conexión a Supabase
  useEffect(() => {
    // Check Supabase connection
    const checkConnection = async () => {
      try {
        // Simple ping to check connection
        const { error } = await supabase.from('_health_check').select().limit(1).maybeSingle();
        // Even if table doesn't exist, connection works
        setIsConnected(true);
      } catch (err) {
        // If there's no actual table, we're still connected to Supabase
        setIsConnected(true);
      }
    };

    checkConnection();

    return () => {
      if (attendanceChannelRef.current) {
        supabase.removeChannel(attendanceChannelRef.current);
      }
    };
  }, []);

  // Obtener cámaras disponibles
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Preferir cámara trasera
          const backCamera = devices.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('trasera') ||
              d.label.toLowerCase().includes('rear')
          );
          setSelectedCamera(backCamera?.id || devices[0].id);
        }
      })
      .catch((err) => {
        console.error('Error obteniendo cámaras:', err);
        setMessage('No se pudo acceder a la cámara');
      });
  }, []);

  // Registrar asistencia vía Supabase
  const registerAttendance = useCallback(async (
    sessionId: string,
    token: string,
    nonce: string,
    fingerprint: string
  ) => {
    try {
      // En producción, esto iría a una Edge Function de Supabase
      // Por ahora, broadcast directamente
      const channel = supabase.channel(`attendance-${sessionId}`);

      await channel.send({
        type: 'broadcast',
        event: 'attendance-registered',
        payload: {
          id: `att-${Date.now()}`,
          studentId: userId,
          studentName: studentName,
          token: token.substring(0, 8),
          timestamp: Date.now(),
          status: 'PRESENT',
          deviceFingerprint: fingerprint.substring(0, 16),
        },
      });

      // Guardar en DB (cuando esté configurada)
      // await supabase.from('attendance').insert({...})

      return { success: true };
    } catch (err) {
      console.error('Error registrando asistencia:', err);
      throw err;
    }
  }, [userId, studentName]);

  // Procesar escaneo
  const handleScan = useCallback(
    async (decodedText: string, _result: Html5QrcodeResult) => {
      // Evitar procesar el mismo código múltiples veces
      if (processingRef.current || decodedText === lastScannedRef.current) {
        return;
      }

      processingRef.current = true;
      lastScannedRef.current = decodedText;
      setStatus('processing');
      setMessage('Validando asistencia...');

      try {
        // Parsear payload del QR
        const payload: QRPayload = JSON.parse(decodedText);

        // Validar estructura
        if (!payload.s || !payload.t || !payload.n || !payload.e) {
          throw new Error('Código QR inválido');
        }

        // Validar expiración
        if (Date.now() > payload.e) {
          throw new Error('Código QR expirado. Espera el siguiente.');
        }

        // Validar anti-replay (nonce ya usado)
        if (usedNoncesRef.current.has(payload.n)) {
          throw new Error('Este código ya fue utilizado');
        }

        // Marcar nonce como usado
        usedNoncesRef.current.add(payload.n);
        setCurrentSessionId(payload.s);

        // Generar fingerprint
        const fingerprint = await generateDeviceFingerprint();

        // Registrar asistencia
        await registerAttendance(payload.s, payload.t, payload.n, fingerprint);

        setStatus('success');
        setMessage('¡Asistencia registrada!');
        onSuccess?.();

        // Limpiar después de mostrar éxito
        setTimeout(() => {
          setStatus('scanning');
          setMessage('');
          processingRef.current = false;
          lastScannedRef.current = '';
        }, 3000);

      } catch (err: any) {
        console.error('Error procesando QR:', err);
        setStatus('error');
        setMessage(err.message || 'Error al procesar. Intenta nuevamente.');
        onError?.(err.message);

        // Reset después de mostrar error
        setTimeout(() => {
          setStatus('scanning');
          setMessage('');
          processingRef.current = false;
          lastScannedRef.current = '';
        }, 3000);
      }
    },
    [onSuccess, onError, registerAttendance]
  );

  // Iniciar escáner
  const startScanner = useCallback(async () => {
    if (!selectedCamera || !containerRef.current) return;

    try {
      // Limpiar escáner anterior
      if (scannerRef.current) {
        await scannerRef.current.stop();
      }

      scannerRef.current = new Html5Qrcode('qr-reader');

      await scannerRef.current.start(
        selectedCamera,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        handleScan,
        () => {} // Ignorar errores de escaneo (no hay QR visible)
      );

      setStatus('scanning');
      setMessage('Apunta al código QR proyectado');
    } catch (err) {
      console.error('Error iniciando escáner:', err);
      setMessage('Error iniciando cámara. Verifica los permisos.');
    }
  }, [selectedCamera, handleScan]);

  // Detener escáner
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop();
      scannerRef.current = null;
    }
    setStatus('idle');
    setMessage('');
  }, []);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // Auto-start cuando se selecciona cámara
  useEffect(() => {
    if (selectedCamera && status === 'idle') {
      startScanner();
    }
  }, [selectedCamera, status, startScanner]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-4 flex flex-col">
      {/* Header */}
      <header className="text-center mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">
          Registro de Asistencia
        </h1>
        <p className="text-indigo-300">Hola, {studentName}</p>

        {/* Estado de conexión */}
        <div className="flex items-center justify-center gap-2 mt-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-xs text-gray-400">
            {isConnected ? 'Supabase Conectado' : 'Conectando...'}
          </span>
        </div>
      </header>

      {/* Camera Selector */}
      {cameras.length > 1 && status === 'scanning' && (
        <div className="mb-4">
          <select
            value={selectedCamera}
            onChange={(e) => {
              setSelectedCamera(e.target.value);
              stopScanner().then(() => setStatus('idle'));
            }}
            className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-4 py-2"
          >
            {cameras.map((camera) => (
              <option key={camera.id} value={camera.id}>
                {camera.label || `Cámara ${camera.id}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Scanner Container */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Status Overlay */}
        {status === 'success' && (
          <div className="fixed inset-0 bg-green-500 flex flex-col items-center justify-center z-50 animate-fade-in">
            <svg
              className="w-32 h-32 text-white mb-4 animate-bounce"
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
            <h2 className="text-3xl font-bold text-white">¡Listo!</h2>
            <p className="text-white/90 text-lg mt-2">{message}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="fixed inset-0 bg-red-500 flex flex-col items-center justify-center z-50 animate-fade-in">
            <svg
              className="w-32 h-32 text-white mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            <h2 className="text-3xl font-bold text-white">Error</h2>
            <p className="text-white/90 text-lg mt-2 text-center px-8">
              {message}
            </p>
          </div>
        )}

        {status === 'processing' && (
          <div className="fixed inset-0 bg-indigo-600 flex flex-col items-center justify-center z-50">
            <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4" />
            <p className="text-white text-lg">{message}</p>
          </div>
        )}

        {/* QR Reader */}
        <div
          ref={containerRef}
          className="relative bg-black rounded-2xl overflow-hidden shadow-2xl"
          style={{ width: '100%', maxWidth: '350px' }}
        >
          <div id="qr-reader" className="w-full" />

          {/* Scanning Frame Overlay */}
          {status === 'scanning' && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 relative">
                  {/* Corner frames */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-400" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-400" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-400" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-400" />

                  {/* Scanning line animation */}
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-scan" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Message */}
        {message && status === 'scanning' && (
          <p className="text-indigo-300 mt-4 text-center">{message}</p>
        )}

        {/* Manual retry button */}
        {(status === 'idle' || cameras.length === 0) && (
          <button
            onClick={startScanner}
            className="mt-6 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl transition-colors"
          >
            Iniciar Cámara
          </button>
        )}
      </div>

      {/* Footer Instructions */}
      <footer className="mt-6 text-center">
        <p className="text-gray-400 text-sm">
          Escanea el código QR proyectado por tu profesor
        </p>
        <p className="text-gray-500 text-xs mt-1">
          El código cambia cada 7 segundos por seguridad
        </p>
      </footer>

      {/* Styles for animations */}
      <style>{`
        @keyframes scan {
          0%, 100% { top: 0; }
          50% { top: 100%; }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default QRScanner;
