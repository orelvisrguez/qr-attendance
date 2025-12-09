// ============================================
// SUPABASE CLIENT FOR SERVERLESS FUNCTIONS
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente con service role para operaciones del servidor
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Tipos para la base de datos
export interface DbUser {
  id: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: 'ADMIN' | 'PROFESOR' | 'ALUMNO';
  is_active: boolean;
  created_at: string;
}

export interface DbAttendanceSession {
  id: string;
  course_id: string;
  subject_id: string;
  profesor_id: string;
  status: 'ACTIVE' | 'PAUSED' | 'CLOSED';
  secret: string;
  qr_rotation_seconds: number;
  token_valid_seconds: number;
  started_at: string;
  ended_at: string | null;
}

export interface DbAttendance {
  id: string;
  session_id: string;
  student_id: string;
  status: 'PRESENTE' | 'AUSENTE' | 'TARDANZA' | 'JUSTIFICADO';
  scanned_at: string;
  device_fingerprint: string | null;
  ip_address: string | null;
  token_used: string | null;
}

export interface DbCourse {
  id: string;
  name: string;
  grade: string;
  section: string;
  year: number;
  is_active: boolean;
}

export interface DbSubject {
  id: string;
  name: string;
  code: string;
  course_id: string;
}
