// ============================================
// ATTENDANCE API - Vercel Serverless Function
// Registro de asistencia con validación anti-duplicados
// ============================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin, isSupabaseConfigured } from './_lib/supabase.js';
import crypto from 'crypto';

// Configuración
const LATE_THRESHOLD_MINUTES = 15; // Después de 15 min = tardanza

// CORS headers helper
function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
}

// Validar token QR
function validateQRToken(
  sessionSecret: string,
  token: string,
  nonce: string,
  expiresAt: number
): boolean {
  // Verificar expiración
  if (Date.now() > expiresAt) {
    return false;
  }

  // Regenerar token para validar
  const expectedToken = crypto
    .createHmac('sha256', sessionSecret)
    .update(`${nonce}:${expiresAt}`)
    .digest('hex')
    .substring(0, 16);

  return token === expectedToken;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verificar que Supabase está configurado
  if (!isSupabaseConfigured) {
    return res.status(503).json({
      success: false,
      error: 'Base de datos no configurada. La asistencia requiere conexión a la base de datos.',
    });
  }

  // ============================================
  // POST /api/attendance - Registrar asistencia
  // ============================================
  if (req.method === 'POST') {
    try {
      const {
        sessionId,
        studentId,
        token,
        nonce,
        expiresAt,
        deviceFingerprint,
      } = req.body;

      // Validar campos requeridos
      if (!sessionId || !studentId || !token || !nonce || !expiresAt) {
        return res.status(400).json({
          success: false,
          error: 'Faltan campos requeridos',
        });
      }

      // 1. Verificar que la sesión existe y está activa
      const { data: session, error: sessionError } = await supabaseAdmin
        .from('attendance_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        return res.status(404).json({
          success: false,
          error: 'Sesión no encontrada',
        });
      }

      if (session.status !== 'ACTIVE') {
        return res.status(400).json({
          success: false,
          error: 'La sesión no está activa',
        });
      }

      // 2. Validar el token QR
      if (!validateQRToken(session.secret, token, nonce, expiresAt)) {
        return res.status(400).json({
          success: false,
          error: 'Código QR inválido o expirado',
        });
      }

      // 3. Verificar que el nonce no ha sido usado (anti-replay)
      const { data: existingNonce } = await supabaseAdmin
        .from('used_tokens')
        .select('id')
        .eq('session_id', sessionId)
        .eq('nonce', nonce)
        .single();

      if (existingNonce) {
        return res.status(400).json({
          success: false,
          error: 'Este código QR ya fue utilizado',
        });
      }

      // 4. Verificar que el alumno no ha registrado asistencia en esta sesión
      const { data: existingAttendance } = await supabaseAdmin
        .from('attendances')
        .select('id, status, scanned_at')
        .eq('session_id', sessionId)
        .eq('student_id', studentId)
        .single();

      if (existingAttendance) {
        return res.status(409).json({
          success: false,
          error: 'Ya registraste tu asistencia en esta clase',
          existingRecord: {
            status: existingAttendance.status,
            scannedAt: existingAttendance.scanned_at,
          },
        });
      }

      // 5. Determinar estado (presente o tardanza)
      const sessionStartedAt = new Date(session.started_at).getTime();
      const now = Date.now();
      const minutesSinceStart = (now - sessionStartedAt) / 1000 / 60;

      const status = minutesSinceStart > LATE_THRESHOLD_MINUTES ? 'TARDANZA' : 'PRESENTE';

      // 6. Registrar el nonce como usado
      await supabaseAdmin.from('used_tokens').insert({
        session_id: sessionId,
        nonce: nonce,
        used_by: studentId,
      });

      // 7. Registrar la asistencia
      const { data: attendance, error: attendanceError } = await supabaseAdmin
        .from('attendances')
        .insert({
          session_id: sessionId,
          student_id: studentId,
          status: status,
          device_fingerprint: deviceFingerprint || null,
          ip_address: req.headers['x-forwarded-for'] as string || req.headers['x-real-ip'] as string || null,
          user_agent: req.headers['user-agent'] || null,
          token_used: nonce,
        })
        .select()
        .single();

      if (attendanceError) {
        // Si es error de duplicado, manejarlo elegantemente
        if (attendanceError.code === '23505') {
          return res.status(409).json({
            success: false,
            error: 'Ya registraste tu asistencia en esta clase',
          });
        }

        console.error('Error insertando asistencia:', attendanceError);
        return res.status(500).json({
          success: false,
          error: 'Error al registrar asistencia',
        });
      }

      // 8. Obtener datos del estudiante para el broadcast
      const { data: student } = await supabaseAdmin
        .from('users')
        .select('first_name, last_name')
        .eq('id', studentId)
        .single();

      return res.status(201).json({
        success: true,
        data: {
          id: attendance.id,
          status: status,
          scannedAt: attendance.scanned_at,
          studentName: student ? `${student.first_name} ${student.last_name}` : 'Alumno',
          message: status === 'TARDANZA'
            ? '¡Asistencia registrada con tardanza!'
            : '¡Asistencia registrada correctamente!',
        },
      });
    } catch (error) {
      console.error('Error en POST /api/attendance:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // ============================================
  // GET /api/attendance?sessionId=xxx - Listar asistencia de sesión
  // ============================================
  if (req.method === 'GET') {
    try {
      const { sessionId } = req.query;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'sessionId es requerido',
        });
      }

      const { data: attendances, error } = await supabaseAdmin
        .from('attendances')
        .select(`
          id,
          status,
          scanned_at,
          student:users!student_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('session_id', sessionId)
        .order('scanned_at', { ascending: true });

      if (error) {
        console.error('Error obteniendo asistencias:', error);
        return res.status(500).json({
          success: false,
          error: 'Error al obtener asistencias',
        });
      }

      return res.status(200).json({
        success: true,
        data: attendances.map((a: any) => ({
          id: a.id,
          studentId: a.student?.id,
          studentName: a.student ? `${a.student.first_name} ${a.student.last_name}` : 'Desconocido',
          studentEmail: a.student?.email,
          status: a.status,
          scannedAt: a.scanned_at,
        })),
      });
    } catch (error) {
      console.error('Error en GET /api/attendance:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
