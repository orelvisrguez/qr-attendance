// ============================================
// QR ATTENDANCE SYSTEM - TYPE DEFINITIONS
// ============================================

// User Roles
export type UserRole = 'ADMIN' | 'PROFESOR' | 'ALUMNO';

export type AttendanceStatus = 'PRESENTE' | 'AUSENTE' | 'TARDANZA' | 'JUSTIFICADO';

export type SessionStatus = 'ACTIVE' | 'PAUSED' | 'CLOSED';

// ============================================
// User Types
// ============================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatar?: string;
  isActive: boolean;
}

export interface AuthUser extends User {
  accessToken: string;
}

// ============================================
// Academic Types
// ============================================

export interface Course {
  id: string;
  name: string;
  grade: string;
  section: string;
  year: number;
  isActive: boolean;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
  courseId: string;
}

// ============================================
// Attendance Session Types
// ============================================

export interface AttendanceSession {
  id: string;
  courseId: string;
  subjectId: string;
  profesorId: string;
  status: SessionStatus;
  qrRotationSeconds: number;
  tokenValidSeconds: number;
  startedAt: Date;
  endedAt?: Date;
  course?: Course;
  subject?: Subject;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  scannedAt: Date;
  student?: User;
}

// ============================================
// QR Token Types
// ============================================

export interface QRPayload {
  sid: string;      // Session ID
  ts: number;       // Timestamp (Unix ms)
  n: string;        // Nonce (único por cada QR)
}

export interface QRTokenData {
  token: string;          // Token encriptado (para el QR)
  expiresAt: number;      // Timestamp de expiración
  nonce: string;          // Nonce para tracking
}

export interface QRValidationResult {
  valid: boolean;
  error?: string;
  payload?: QRPayload;
  isExpired?: boolean;
  isReplay?: boolean;
}

// ============================================
// Socket.io Event Types
// ============================================

export interface ServerToClientEvents {
  // Profesor recibe actualizaciones de asistencia
  'attendance:new': (data: AttendanceRecord) => void;
  'attendance:list': (data: AttendanceRecord[]) => void;

  // Alumno recibe nuevo QR
  'qr:update': (data: QRTokenData) => void;

  // Session status updates
  'session:status': (data: { sessionId: string; status: SessionStatus }) => void;

  // Errors
  'error': (data: { message: string; code: string }) => void;
}

export interface ClientToServerEvents {
  // Profesor inicia/detiene sesión
  'session:join': (sessionId: string) => void;
  'session:leave': (sessionId: string) => void;
  'session:start-qr': (sessionId: string) => void;
  'session:stop-qr': (sessionId: string) => void;

  // Alumno escanea QR
  'attendance:scan': (data: {
    token: string;
    deviceFingerprint: string;
  }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: string;
  role: UserRole;
  sessionId?: string;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// Dashboard Metrics
// ============================================

export interface AttendanceMetrics {
  totalSessions: number;
  totalStudents: number;
  averageAttendance: number; // Porcentaje
  todayAttendance: number;
  weeklyTrend: {
    date: string;
    attendance: number;
  }[];
}

export interface CourseMetrics {
  courseId: string;
  courseName: string;
  totalStudents: number;
  attendanceRate: number;
  lastSession?: Date;
}
