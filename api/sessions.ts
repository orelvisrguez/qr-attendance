// ============================================
// SESSIONS API - Vercel Serverless Function
// Gestión de sesiones de asistencia
// ============================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin, isSupabaseConfigured } from './_lib/supabase.js';
import crypto from 'crypto';

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

// Generar secreto seguro para la sesión
function generateSessionSecret(): string {
  return crypto.randomBytes(32).toString('hex');
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
      error: 'Base de datos no configurada. Las sesiones requieren conexión a la base de datos.',
    });
  }

  // ============================================
  // POST /api/sessions - Crear nueva sesión
  // ============================================
  if (req.method === 'POST') {
    try {
      const {
        courseId,
        subjectId,
        profesorId,
        qrRotationSeconds = 7,
        tokenValidSeconds = 10,
      } = req.body;

      // Validar campos requeridos
      if (!courseId || !subjectId || !profesorId) {
        return res.status(400).json({
          success: false,
          error: 'courseId, subjectId y profesorId son requeridos',
        });
      }

      // Verificar que no hay una sesión activa para este curso/materia
      const { data: existingSession } = await supabaseAdmin
        .from('attendance_sessions')
        .select('id')
        .eq('course_id', courseId)
        .eq('subject_id', subjectId)
        .eq('status', 'ACTIVE')
        .single();

      if (existingSession) {
        return res.status(409).json({
          success: false,
          error: 'Ya existe una sesión activa para esta clase',
          existingSessionId: existingSession.id,
        });
      }

      // Generar secreto único para esta sesión
      const secret = generateSessionSecret();

      // Crear la sesión
      const { data: session, error: sessionError } = await supabaseAdmin
        .from('attendance_sessions')
        .insert({
          course_id: courseId,
          subject_id: subjectId,
          profesor_id: profesorId,
          status: 'ACTIVE',
          secret: secret,
          qr_rotation_seconds: qrRotationSeconds,
          token_valid_seconds: tokenValidSeconds,
        })
        .select(`
          *,
          course:courses(id, name, grade, section),
          subject:subjects(id, name, code)
        `)
        .single();

      if (sessionError) {
        console.error('Error creando sesión:', sessionError);
        return res.status(500).json({
          success: false,
          error: 'Error al crear la sesión',
        });
      }

      return res.status(201).json({
        success: true,
        data: {
          id: session.id,
          courseId: session.course_id,
          subjectId: session.subject_id,
          courseName: session.course?.name,
          subjectName: session.subject?.name,
          status: session.status,
          secret: session.secret, // El frontend lo necesita para generar QRs
          qrRotationSeconds: session.qr_rotation_seconds,
          tokenValidSeconds: session.token_valid_seconds,
          startedAt: session.started_at,
        },
      });
    } catch (error) {
      console.error('Error en POST /api/sessions:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // ============================================
  // GET /api/sessions - Listar sesiones
  // ============================================
  if (req.method === 'GET') {
    try {
      const { profesorId, status, sessionId } = req.query;

      // Si se pide una sesión específica
      if (sessionId) {
        const { data: session, error } = await supabaseAdmin
          .from('attendance_sessions')
          .select(`
            *,
            course:courses(id, name, grade, section),
            subject:subjects(id, name, code),
            attendances(
              id,
              status,
              scanned_at,
              student:users!student_id(id, first_name, last_name)
            )
          `)
          .eq('id', sessionId)
          .single();

        if (error || !session) {
          return res.status(404).json({
            success: false,
            error: 'Sesión no encontrada',
          });
        }

        return res.status(200).json({
          success: true,
          data: {
            id: session.id,
            courseId: session.course_id,
            subjectId: session.subject_id,
            courseName: session.course?.name,
            subjectName: session.subject?.name,
            status: session.status,
            secret: session.secret,
            qrRotationSeconds: session.qr_rotation_seconds,
            startedAt: session.started_at,
            endedAt: session.ended_at,
            attendees: session.attendances?.map((a: any) => ({
              id: a.id,
              studentId: a.student?.id,
              studentName: `${a.student?.first_name} ${a.student?.last_name}`,
              status: a.status,
              scannedAt: a.scanned_at,
            })) || [],
          },
        });
      }

      // Listar sesiones del profesor
      let query = supabaseAdmin
        .from('attendance_sessions')
        .select(`
          id,
          status,
          started_at,
          ended_at,
          course:courses(id, name, grade, section),
          subject:subjects(id, name, code)
        `)
        .order('started_at', { ascending: false });

      if (profesorId) {
        query = query.eq('profesor_id', profesorId);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data: sessions, error } = await query.limit(50);

      if (error) {
        console.error('Error obteniendo sesiones:', error);
        return res.status(500).json({
          success: false,
          error: 'Error al obtener sesiones',
        });
      }

      return res.status(200).json({
        success: true,
        data: sessions.map((s: any) => ({
          id: s.id,
          courseName: s.course?.name,
          subjectName: s.subject?.name,
          status: s.status,
          startedAt: s.started_at,
          endedAt: s.ended_at,
        })),
      });
    } catch (error) {
      console.error('Error en GET /api/sessions:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // ============================================
  // PUT /api/sessions - Actualizar sesión (pausar/cerrar)
  // ============================================
  if (req.method === 'PUT') {
    try {
      const { sessionId, status } = req.body;

      if (!sessionId || !status) {
        return res.status(400).json({
          success: false,
          error: 'sessionId y status son requeridos',
        });
      }

      if (!['ACTIVE', 'PAUSED', 'CLOSED'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'status debe ser ACTIVE, PAUSED o CLOSED',
        });
      }

      const updateData: any = { status };

      if (status === 'CLOSED') {
        updateData.ended_at = new Date().toISOString();
      }

      const { data: session, error } = await supabaseAdmin
        .from('attendance_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        console.error('Error actualizando sesión:', error);
        return res.status(500).json({
          success: false,
          error: 'Error al actualizar la sesión',
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          id: session.id,
          status: session.status,
          endedAt: session.ended_at,
        },
      });
    } catch (error) {
      console.error('Error en PUT /api/sessions:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
