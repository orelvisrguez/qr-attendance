// ============================================
// PROFESOR COURSES API - Vercel Serverless Function
// Obtener cursos y materias asignados al profesor
// ============================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin, isSupabaseConfigured } from '../_lib/supabase.js';

// CORS headers helper
function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Verificar que Supabase está configurado
  if (!isSupabaseConfigured) {
    return res.status(503).json({
      success: false,
      error: 'Base de datos no configurada. Por favor configure las variables de entorno.',
    });
  }

  try {
    const { profesorId } = req.query;

    if (!profesorId) {
      return res.status(400).json({
        success: false,
        error: 'profesorId es requerido',
      });
    }

    // Obtener cursos asignados al profesor
    const { data: courseAssignments, error: courseError } = await supabaseAdmin
      .from('course_profesors')
      .select(`
        course:courses (
          id,
          name,
          grade,
          section,
          year,
          is_active
        )
      `)
      .eq('profesor_id', profesorId);

    if (courseError) {
      console.error('Error obteniendo cursos del profesor:', courseError);
      return res.status(500).json({
        success: false,
        error: 'Error al obtener cursos',
      });
    }

    if (!courseAssignments || courseAssignments.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          courses: [],
          subjects: [],
        },
        message: 'No hay cursos asignados a este profesor',
      });
    }

    // Extraer cursos únicos y activos
    const courseIds: string[] = [];
    const courses = courseAssignments
      .map((ca: { course: { id: string; name: string; grade: string; section: string; year: number; is_active: boolean } }) => ca.course)
      .filter((c) => c && c.is_active)
      .map((c) => {
        courseIds.push(c.id);
        return {
          id: c.id,
          name: c.name,
          grade: c.grade,
          section: c.section,
          year: c.year,
        };
      });

    // Eliminar duplicados
    const uniqueCourses = courses.filter((course, index, self) =>
      index === self.findIndex((c) => c.id === course.id)
    );

    // Obtener materias de esos cursos
    let subjects: { id: string; name: string; code: string; courseId: string }[] = [];

    if (courseIds.length > 0) {
      const uniqueCourseIds = [...new Set(courseIds)];
      const { data: subjectData, error: subjectError } = await supabaseAdmin
        .from('subjects')
        .select('id, name, code, course_id')
        .in('course_id', uniqueCourseIds);

      if (subjectError) {
        console.error('Error obteniendo materias:', subjectError);
      } else if (subjectData) {
        subjects = subjectData.map((s) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          courseId: s.course_id,
        }));
      }
    }

    // Obtener conteo de estudiantes por curso
    const coursesWithStudentCount = await Promise.all(
      uniqueCourses.map(async (course) => {
        const { count } = await supabaseAdmin
          .from('course_students')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id);

        return {
          ...course,
          studentCount: count || 0,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: {
        courses: coursesWithStudentCount,
        subjects,
      },
    });
  } catch (error) {
    console.error('Error en GET /api/profesor/courses:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
}
