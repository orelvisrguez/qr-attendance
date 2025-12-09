// ============================================
// SUPABASE CLIENT
// Cliente de Supabase con Realtime habilitado
// ============================================

import { createClient, RealtimeChannel } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials not configured. Using mock mode.');
}

// Crear cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// ============================================
// REALTIME CHANNELS
// ============================================

type QRPayload = {
  sessionId: string;
  token: string;
  timestamp: number;
  expiresAt: number;
};

type AttendancePayload = {
  sessionId: string;
  odentId: string;
  studentName: string;
  timestamp: number;
  status: 'success' | 'error';
  message?: string;
};

// Canal para rotación de QR
export function subscribeToQRChannel(
  sessionId: string,
  onQRUpdate: (payload: QRPayload) => void
): RealtimeChannel {
  const channel = supabase.channel(`qr-session-${sessionId}`, {
    config: {
      broadcast: { self: true },
    },
  });

  channel
    .on('broadcast', { event: 'qr-update' }, ({ payload }) => {
      onQRUpdate(payload as QRPayload);
    })
    .subscribe();

  return channel;
}

// Emitir nuevo QR
export async function broadcastQRUpdate(
  sessionId: string,
  payload: QRPayload
): Promise<void> {
  const channel = supabase.channel(`qr-session-${sessionId}`);

  await channel.send({
    type: 'broadcast',
    event: 'qr-update',
    payload,
  });
}

// Canal para notificaciones de asistencia (live feed)
export function subscribeToAttendanceChannel(
  sessionId: string,
  onAttendance: (payload: AttendancePayload) => void
): RealtimeChannel {
  const channel = supabase.channel(`attendance-${sessionId}`, {
    config: {
      broadcast: { self: true },
    },
  });

  channel
    .on('broadcast', { event: 'attendance-registered' }, ({ payload }) => {
      onAttendance(payload as AttendancePayload);
    })
    .subscribe();

  return channel;
}

// Emitir registro de asistencia
export async function broadcastAttendance(
  sessionId: string,
  payload: AttendancePayload
): Promise<void> {
  const channel = supabase.channel(`attendance-${sessionId}`);

  await channel.send({
    type: 'broadcast',
    event: 'attendance-registered',
    payload,
  });
}

// Limpiar canal
export function unsubscribeChannel(channel: RealtimeChannel): void {
  supabase.removeChannel(channel);
}

// ============================================
// DATABASE HELPERS
// ============================================

// Tipos de base de datos
export interface DBUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'ADMIN' | 'PROFESOR' | 'ALUMNO';
  status: 'active' | 'inactive';
  created_at: string;
}

export interface DBCourse {
  id: string;
  name: string;
  grade: string;
  section: string;
  year: number;
  is_active: boolean;
}

export interface DBSubject {
  id: string;
  course_id: string;
  name: string;
  code: string;
  description: string;
}

export interface DBAttendanceSession {
  id: string;
  course_id: string;
  subject_id: string;
  profesor_id: string;
  started_at: string;
  ended_at: string | null;
  status: 'active' | 'closed';
}

export interface DBAttendance {
  id: string;
  session_id: string;
  student_id: string;
  checked_in_at: string;
  status: 'present' | 'late' | 'absent';
  device_fingerprint: string | null;
  ip_address: string | null;
}

// ============================================
// AUTH HELPERS
// ============================================

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}

export async function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback);
}

export default supabase;
