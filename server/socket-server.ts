// ============================================
// QR ATTENDANCE SYSTEM - SOCKET.IO SERVER
// Servidor de tiempo real para QR rotativo
// ============================================

import { Server as HTTPServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  AttendanceRecord,
  QRTokenData,
} from '../src/types';
import {
  generateQRToken,
  validateQRToken,
  hashFingerprint,
} from '../src/lib/crypto';

// ============================================
// TYPES
// ============================================

type TypedSocketServer = SocketServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

interface ActiveSession {
  sessionId: string;
  secret: string;
  profesorSocketId: string;
  rotationInterval: NodeJS.Timeout | null;
  rotationSeconds: number;
  validSeconds: number;
  currentToken: QRTokenData | null;
  attendees: Map<string, AttendanceRecord>;
}

// ============================================
// SESSION MANAGER
// Gestiona las sesiones activas de asistencia
// ============================================

class SessionManager {
  private sessions: Map<string, ActiveSession> = new Map();

  createSession(
    sessionId: string,
    secret: string,
    profesorSocketId: string,
    rotationSeconds: number = 7,
    validSeconds: number = 10
  ): ActiveSession {
    const session: ActiveSession = {
      sessionId,
      secret,
      profesorSocketId,
      rotationInterval: null,
      rotationSeconds,
      validSeconds,
      currentToken: null,
      attendees: new Map(),
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId: string): ActiveSession | undefined {
    return this.sessions.get(sessionId);
  }

  removeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session?.rotationInterval) {
      clearInterval(session.rotationInterval);
    }
    this.sessions.delete(sessionId);
  }

  addAttendee(sessionId: string, record: AttendanceRecord): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    // Verificar si ya está registrado
    if (session.attendees.has(record.studentId)) {
      return false;
    }

    session.attendees.set(record.studentId, record);
    return true;
  }

  getAttendees(sessionId: string): AttendanceRecord[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    return Array.from(session.attendees.values());
  }

  isTokenUsed(sessionId: string, nonce: string): boolean {
    // En producción: verificar en base de datos
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    return Array.from(session.attendees.values()).some(a => a.id === nonce);
  }
}

// ============================================
// SOCKET SERVER INITIALIZATION
// ============================================

export const initializeSocketServer = (httpServer: HTTPServer): TypedSocketServer => {
  const io: TypedSocketServer = new SocketServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  const sessionManager = new SessionManager();

  // Middleware de autenticación
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      // TODO: Validar JWT y extraer usuario
      // Por ahora, simular datos del usuario
      const userId = socket.handshake.auth.userId || 'test-user';
      const role = socket.handshake.auth.role || 'ALUMNO';

      socket.data.userId = userId;
      socket.data.role = role;

      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  // ============================================
  // CONNECTION HANDLER
  // ============================================

  io.on('connection', (socket) => {
    console.log(`[Socket] Usuario conectado: ${socket.data.userId} (${socket.data.role})`);

    // ========================================
    // PROFESOR: Unirse a sesión
    // ========================================
    socket.on('session:join', async (sessionId: string) => {
      if (socket.data.role !== 'PROFESOR' && socket.data.role !== 'ADMIN') {
        socket.emit('error', {
          message: 'No autorizado',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      socket.join(`session:${sessionId}`);
      socket.data.sessionId = sessionId;

      // Enviar lista actual de asistentes
      const attendees = sessionManager.getAttendees(sessionId);
      socket.emit('attendance:list', attendees);

      console.log(`[Socket] Profesor ${socket.data.userId} se unió a sesión ${sessionId}`);
    });

    // ========================================
    // PROFESOR: Iniciar rotación de QR
    // ========================================
    socket.on('session:start-qr', async (sessionId: string) => {
      if (socket.data.role !== 'PROFESOR' && socket.data.role !== 'ADMIN') {
        socket.emit('error', {
          message: 'No autorizado para iniciar QR',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      // TODO: Obtener secreto de la base de datos
      const sessionSecret = 'session-secret-from-db';
      const rotationSeconds = 7;
      const validSeconds = 10;

      // Crear o actualizar sesión activa
      let activeSession = sessionManager.getSession(sessionId);

      if (!activeSession) {
        activeSession = sessionManager.createSession(
          sessionId,
          sessionSecret,
          socket.id,
          rotationSeconds,
          validSeconds
        );
      }

      // Limpiar intervalo anterior si existe
      if (activeSession.rotationInterval) {
        clearInterval(activeSession.rotationInterval);
      }

      // Función para generar y emitir nuevo QR
      const rotateQR = async () => {
        try {
          const tokenData = await generateQRToken(
            sessionId,
            sessionSecret,
            validSeconds
          );

          activeSession!.currentToken = tokenData;

          // Emitir nuevo QR a la sala del profesor
          io.to(`session:${sessionId}`).emit('qr:update', tokenData);

          console.log(`[QR] Nuevo token generado para sesión ${sessionId}`);
        } catch (error) {
          console.error('[QR] Error generando token:', error);
        }
      };

      // Generar primer QR inmediatamente
      await rotateQR();

      // Iniciar rotación automática
      activeSession.rotationInterval = setInterval(rotateQR, rotationSeconds * 1000);

      console.log(`[Socket] QR rotativo iniciado para sesión ${sessionId} (cada ${rotationSeconds}s)`);
    });

    // ========================================
    // PROFESOR: Detener rotación de QR
    // ========================================
    socket.on('session:stop-qr', (sessionId: string) => {
      const activeSession = sessionManager.getSession(sessionId);

      if (activeSession?.rotationInterval) {
        clearInterval(activeSession.rotationInterval);
        activeSession.rotationInterval = null;
        activeSession.currentToken = null;
      }

      io.to(`session:${sessionId}`).emit('session:status', {
        sessionId,
        status: 'PAUSED',
      });

      console.log(`[Socket] QR rotativo detenido para sesión ${sessionId}`);
    });

    // ========================================
    // ALUMNO: Escanear QR
    // ========================================
    socket.on('attendance:scan', async (data) => {
      const { token, deviceFingerprint } = data;

      if (socket.data.role !== 'ALUMNO') {
        socket.emit('error', {
          message: 'Solo alumnos pueden marcar asistencia',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      try {
        // TODO: Obtener sessionId y secret de la base de datos
        // Por ahora, extraer del token (en producción: lookup en DB)
        const sessionId = 'extracted-session-id';
        const sessionSecret = 'session-secret-from-db';
        const validSeconds = 10;

        // Validar token
        const validation = await validateQRToken(
          token,
          sessionId,
          sessionSecret,
          validSeconds
        );

        if (!validation.valid) {
          socket.emit('error', {
            message: validation.error || 'Token inválido',
            code: validation.isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
          });
          return;
        }

        // Verificar replay attack
        if (validation.payload && sessionManager.isTokenUsed(sessionId, validation.payload.n)) {
          socket.emit('error', {
            message: 'Este código ya fue utilizado',
            code: 'TOKEN_REUSED',
          });
          return;
        }

        // Verificar fingerprint (anti multi-cuenta)
        const hashedFingerprint = await hashFingerprint(deviceFingerprint);
        // TODO: Verificar en DB si este fingerprint ya se usó para otro usuario

        // Crear registro de asistencia
        const attendanceRecord: AttendanceRecord = {
          id: validation.payload!.n, // Usar nonce como ID temporal
          sessionId,
          studentId: socket.data.userId,
          status: 'PRESENTE',
          scannedAt: new Date(),
          student: {
            id: socket.data.userId,
            email: 'student@example.com',
            firstName: 'Nombre',
            lastName: 'Alumno',
            role: 'ALUMNO',
            isActive: true,
          },
        };

        // Registrar asistencia
        const added = sessionManager.addAttendee(sessionId, attendanceRecord);

        if (!added) {
          socket.emit('error', {
            message: 'Ya registraste tu asistencia en esta clase',
            code: 'ALREADY_REGISTERED',
          });
          return;
        }

        // TODO: Guardar en base de datos

        // Notificar al profesor (live feed)
        io.to(`session:${sessionId}`).emit('attendance:new', attendanceRecord);

        console.log(`[Attendance] ${socket.data.userId} registró asistencia en ${sessionId}`);
      } catch (error) {
        console.error('[Attendance] Error procesando escaneo:', error);
        socket.emit('error', {
          message: 'Error procesando asistencia',
          code: 'INTERNAL_ERROR',
        });
      }
    });

    // ========================================
    // DESCONEXIÓN
    // ========================================
    socket.on('disconnect', () => {
      console.log(`[Socket] Usuario desconectado: ${socket.data.userId}`);

      // Si era profesor, pausar la sesión
      if (socket.data.sessionId && socket.data.role === 'PROFESOR') {
        const session = sessionManager.getSession(socket.data.sessionId);
        if (session && session.profesorSocketId === socket.id) {
          if (session.rotationInterval) {
            clearInterval(session.rotationInterval);
            session.rotationInterval = null;
          }
        }
      }
    });
  });

  return io;
};

export { SessionManager };
