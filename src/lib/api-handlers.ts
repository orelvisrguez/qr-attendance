// ============================================
// API HANDLERS - Lógica del Backend
// Handlers para las API Routes
// ============================================

import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import {
  generateSessionSecret,
  generateQRToken,
  validateQRToken,
  hashFingerprint,
} from './crypto';
import type {
  User,
  AttendanceSession,
  AttendanceRecord,
  QRValidationResult,
  ApiResponse,
} from '../types';

// ============================================
// CONFIGURATION
// ============================================

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-jwt-secret-key-min-32-chars!'
);

const JWT_ISSUER = 'qr-attendance';
const JWT_AUDIENCE = 'qr-attendance-app';

// ============================================
// AUTH HANDLERS
// ============================================

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  user: Omit<User, 'password'>;
  accessToken: string;
}

export const handleLogin = async (
  req: LoginRequest,
  // En producción: usar Prisma client
  findUserByEmail: (email: string) => Promise<(User & { password: string }) | null>
): Promise<ApiResponse<LoginResponse>> => {
  const { email, password } = req;

  // Buscar usuario
  const user = await findUserByEmail(email);

  if (!user) {
    return { success: false, error: 'Credenciales inválidas' };
  }

  // Verificar contraseña
  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    return { success: false, error: 'Credenciales inválidas' };
  }

  if (!user.isActive) {
    return { success: false, error: 'Usuario desactivado' };
  }

  // Generar JWT
  const accessToken = await new SignJWT({
    sub: user.id,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime('24h')
    .sign(JWT_SECRET);

  // Excluir password de la respuesta
  const { password: _, ...userWithoutPassword } = user;

  return {
    success: true,
    data: {
      user: userWithoutPassword,
      accessToken,
    },
  };
};

export const verifyToken = async (
  token: string
): Promise<{ valid: boolean; payload?: { sub: string; email: string; role: string } }> => {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    return {
      valid: true,
      payload: {
        sub: payload.sub as string,
        email: payload.email as string,
        role: payload.role as string,
      },
    };
  } catch (error) {
    return { valid: false };
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

// ============================================
// SESSION HANDLERS
// ============================================

interface CreateSessionRequest {
  courseId: string;
  subjectId: string;
  profesorId: string;
  qrRotationSeconds?: number;
  tokenValidSeconds?: number;
}

export const handleCreateSession = async (
  req: CreateSessionRequest,
  // En producción: usar Prisma client
  createSession: (data: Omit<AttendanceSession, 'id' | 'startedAt'> & { secret: string }) => Promise<AttendanceSession>
): Promise<ApiResponse<AttendanceSession>> => {
  const {
    courseId,
    subjectId,
    profesorId,
    qrRotationSeconds = 7,
    tokenValidSeconds = 10,
  } = req;

  // Generar secreto único para esta sesión
  const secret = generateSessionSecret();

  const session = await createSession({
    courseId,
    subjectId,
    profesorId,
    status: 'ACTIVE',
    qrRotationSeconds,
    tokenValidSeconds,
    secret,
  });

  return {
    success: true,
    data: session,
    message: 'Sesión creada exitosamente',
  };
};

// ============================================
// ATTENDANCE HANDLERS
// ============================================

interface ScanQRRequest {
  token: string;
  studentId: string;
  deviceFingerprint: string;
  ipAddress?: string;
  userAgent?: string;
}

interface ScanQRContext {
  // Funciones de base de datos (inyectadas)
  getSessionByToken: (token: string) => Promise<{ session: AttendanceSession; secret: string } | null>;
  isTokenUsed: (sessionId: string, nonce: string) => Promise<boolean>;
  markTokenUsed: (sessionId: string, nonce: string, studentId: string) => Promise<void>;
  hasExistingAttendance: (sessionId: string, studentId: string) => Promise<boolean>;
  checkDeviceFingerprint: (studentId: string, fingerprint: string) => Promise<{
    isAllowed: boolean;
    usedByAnother: boolean;
  }>;
  createAttendance: (data: Omit<AttendanceRecord, 'id'>) => Promise<AttendanceRecord>;
  getStudent: (studentId: string) => Promise<User | null>;
}

export const handleScanQR = async (
  req: ScanQRRequest,
  ctx: ScanQRContext
): Promise<ApiResponse<AttendanceRecord>> => {
  const { token, studentId, deviceFingerprint, ipAddress, userAgent } = req;

  // 1. Decodificar token para obtener sessionId (sin validar aún)
  // En producción, el token debe incluir metadata para lookup
  const sessionData = await ctx.getSessionByToken(token);

  if (!sessionData) {
    return { success: false, error: 'Sesión no encontrada' };
  }

  const { session, secret } = sessionData;

  // 2. Verificar que la sesión esté activa
  if (session.status !== 'ACTIVE') {
    return { success: false, error: 'La sesión no está activa' };
  }

  // 3. Validar el token QR (timestamp, encriptación)
  const validation: QRValidationResult = await validateQRToken(
    token,
    session.id,
    secret,
    session.tokenValidSeconds
  );

  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || 'Token inválido',
    };
  }

  // 4. Verificar replay attack (token ya usado)
  const nonce = validation.payload!.n;
  const tokenAlreadyUsed = await ctx.isTokenUsed(session.id, nonce);

  if (tokenAlreadyUsed) {
    return { success: false, error: 'Este código ya fue utilizado' };
  }

  // 5. Verificar si el alumno ya registró asistencia
  const alreadyRegistered = await ctx.hasExistingAttendance(session.id, studentId);

  if (alreadyRegistered) {
    return { success: false, error: 'Ya registraste tu asistencia en esta clase' };
  }

  // 6. Verificar device fingerprint (anti multi-cuenta)
  const hashedFingerprint = await hashFingerprint(deviceFingerprint);
  const fingerprintCheck = await ctx.checkDeviceFingerprint(studentId, hashedFingerprint);

  if (!fingerprintCheck.isAllowed) {
    if (fingerprintCheck.usedByAnother) {
      return {
        success: false,
        error: 'Este dispositivo ya fue usado por otro alumno',
      };
    }
    return {
      success: false,
      error: 'Dispositivo no autorizado',
    };
  }

  // 7. Todo válido - Marcar token como usado
  await ctx.markTokenUsed(session.id, nonce, studentId);

  // 8. Determinar estado (PRESENTE o TARDANZA)
  const sessionStartTime = new Date(session.startedAt).getTime();
  const currentTime = Date.now();
  const minutesSinceStart = (currentTime - sessionStartTime) / (1000 * 60);

  // Configuración: después de 15 minutos es tardanza
  const LATE_THRESHOLD_MINUTES = 15;
  const status = minutesSinceStart > LATE_THRESHOLD_MINUTES ? 'TARDANZA' : 'PRESENTE';

  // 9. Crear registro de asistencia
  const attendance = await ctx.createAttendance({
    sessionId: session.id,
    studentId,
    status,
    scannedAt: new Date(),
    deviceFingerprint: hashedFingerprint,
    ipAddress,
    userAgent,
    tokenUsed: nonce,
  } as Omit<AttendanceRecord, 'id'>);

  // 10. Obtener datos del estudiante para la respuesta
  const student = await ctx.getStudent(studentId);
  attendance.student = student || undefined;

  return {
    success: true,
    data: attendance,
    message: status === 'TARDANZA' ? 'Registrado con tardanza' : '¡Asistencia registrada!',
  };
};

// ============================================
// QR GENERATION HANDLER
// ============================================

export const handleGenerateQR = async (
  sessionId: string,
  sessionSecret: string,
  validSeconds: number = 10
) => {
  return generateQRToken(sessionId, sessionSecret, validSeconds);
};

// ============================================
// IP VALIDATION HANDLER
// ============================================

interface IPValidationContext {
  getAllowedIPs: () => Promise<string[]>;
  isIPCheckEnabled: () => Promise<boolean>;
}

export const handleIPValidation = async (
  clientIP: string,
  ctx: IPValidationContext
): Promise<{ allowed: boolean; message?: string }> => {
  const isEnabled = await ctx.isIPCheckEnabled();

  if (!isEnabled) {
    return { allowed: true };
  }

  const allowedIPs = await ctx.getAllowedIPs();

  if (allowedIPs.length === 0) {
    return { allowed: true };
  }

  // Verificar si la IP está en la lista permitida
  const isAllowed = allowedIPs.some((range) => {
    // IP exacta
    if (range === clientIP) return true;

    // CIDR básico (ej: 192.168.1.0/24)
    if (range.includes('/')) {
      // Implementación simplificada
      const [network] = range.split('/');
      const networkPrefix = network.split('.').slice(0, 3).join('.');
      const clientPrefix = clientIP.split('.').slice(0, 3).join('.');
      return networkPrefix === clientPrefix;
    }

    return false;
  });

  if (!isAllowed) {
    return {
      allowed: false,
      message: 'Acceso denegado: debes estar conectado a la red del colegio',
    };
  }

  return { allowed: true };
};
