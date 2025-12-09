// ============================================
// COURSES API - Vercel Serverless Function
// Gestión de cursos con Supabase
// ============================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin, isSupabaseConfigured } from './_lib/supabase.js';

// CORS headers helper
function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
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

  // Verificar que Supabase está configurado
  if (!isSupabaseConfigured) {
    return res.status(503).json({
      success: false,
      error: 'Base de datos no configurada.',
    });
  }

  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const id = pathParts[pathParts.length - 1] !== 'courses' ? pathParts[pathParts.length - 1] : null;

  // ============================================
  // GET /api/courses - Listar cursos
  // ============================================
  if (req.method === 'GET' && !id) {
    try {
      const { year, active } = req.query;

      let query = supabaseAdmin
        .from('courses')
        .select(`
          id,
          name,
          grade,
          section,
          year,
          is_active,
          created_at,
          subjects (
            id,
            name,
            code
          )
        `)
        .order('grade', { ascending: true })
        .order('section', { ascending: true });

      if (year) {
        query = query.eq('year', parseInt(year as string));
      }

      if (active !== undefined) {
        query = query.eq('is_active', active === 'true');
      }

      const { data: courses, error } = await query;

      if (error) {
        console.error('Error obteniendo cursos:', error);
        return res.status(500).json({
          success: false,
          error: 'Error al obtener cursos',
        });
      }

      // Obtener conteo de estudiantes y profesores por curso
      const coursesWithCounts = await Promise.all(
        (courses || []).map(async (course) => {
          const [studentsResult, profesorsResult] = await Promise.all([
            supabaseAdmin
              .from('course_students')
              .select('*', { count: 'exact', head: true })
              .eq('course_id', course.id),
            supabaseAdmin
              .from('course_profesors')
              .select(`
                profesor:users!profesor_id (
                  id,
                  first_name,
                  last_name
                )
              `)
              .eq('course_id', course.id),
          ]);

          return {
            id: course.id,
            name: course.name,
            grade: course.grade,
            section: course.section,
            year: course.year,
            isActive: course.is_active,
            subjects: course.subjects?.map((s: { id: string; name: string; code: string }) => ({
              id: s.id,
              name: s.name,
              code: s.code,
            })) || [],
            profesors: profesorsResult.data?.map((p: { profesor: { id: string; first_name: string; last_name: string } }) => ({
              id: p.profesor?.id,
              name: `${p.profesor?.first_name} ${p.profesor?.last_name}`,
            })) || [],
            studentCount: studentsResult.count || 0,
          };
        })
      );

      // Estadísticas
      const allCourses = courses || [];

      return res.status(200).json({
        success: true,
        data: coursesWithCounts,
        stats: {
          total: allCourses.length,
          active: allCourses.filter((c) => c.is_active).length,
          inactive: allCourses.filter((c) => !c.is_active).length,
        },
      });
    } catch (error) {
      console.error('Error en GET /api/courses:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // ============================================
  // GET /api/courses/:id - Obtener curso
  // ============================================
  if (req.method === 'GET' && id) {
    try {
      const { data: course, error } = await supabaseAdmin
        .from('courses')
        .select(`
          id,
          name,
          grade,
          section,
          year,
          is_active,
          created_at,
          subjects (
            id,
            name,
            code
          )
        `)
        .eq('id', id)
        .single();

      if (error || !course) {
        return res.status(404).json({
          success: false,
          error: 'Curso no encontrado',
        });
      }

      // Obtener profesores y estudiantes
      const [profesorsResult, studentsResult] = await Promise.all([
        supabaseAdmin
          .from('course_profesors')
          .select(`
            profesor:users!profesor_id (
              id,
              first_name,
              last_name,
              email
            )
          `)
          .eq('course_id', id),
        supabaseAdmin
          .from('course_students')
          .select(`
            student:users!student_id (
              id,
              first_name,
              last_name,
              email
            )
          `)
          .eq('course_id', id),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          id: course.id,
          name: course.name,
          grade: course.grade,
          section: course.section,
          year: course.year,
          isActive: course.is_active,
          subjects: course.subjects || [],
          profesors: profesorsResult.data?.map((p: { profesor: { id: string; first_name: string; last_name: string; email: string } }) => ({
            id: p.profesor?.id,
            name: `${p.profesor?.first_name} ${p.profesor?.last_name}`,
            email: p.profesor?.email,
          })) || [],
          students: studentsResult.data?.map((s: { student: { id: string; first_name: string; last_name: string; email: string } }) => ({
            id: s.student?.id,
            name: `${s.student?.first_name} ${s.student?.last_name}`,
            email: s.student?.email,
          })) || [],
        },
      });
    } catch (error) {
      console.error('Error en GET /api/courses/:id:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // ============================================
  // POST /api/courses - Crear curso
  // ============================================
  if (req.method === 'POST' && !id) {
    try {
      const { name, grade, section, year, isActive = true, subjects = [] } = req.body;

      if (!name || !grade || !section || !year) {
        return res.status(400).json({
          success: false,
          error: 'Campos requeridos: name, grade, section, year',
        });
      }

      // Crear curso
      const { data: newCourse, error: courseError } = await supabaseAdmin
        .from('courses')
        .insert({
          name,
          grade,
          section,
          year,
          is_active: isActive,
        })
        .select()
        .single();

      if (courseError) {
        console.error('Error creando curso:', courseError);
        return res.status(500).json({
          success: false,
          error: 'Error al crear curso',
        });
      }

      // Crear materias si se proporcionaron
      if (subjects.length > 0) {
        const subjectsToInsert = subjects.map((s: { name: string; code: string }) => ({
          name: s.name,
          code: s.code,
          course_id: newCourse.id,
        }));

        await supabaseAdmin.from('subjects').insert(subjectsToInsert);
      }

      return res.status(201).json({
        success: true,
        data: {
          id: newCourse.id,
          name: newCourse.name,
          grade: newCourse.grade,
          section: newCourse.section,
          year: newCourse.year,
          isActive: newCourse.is_active,
          subjects: [],
          profesors: [],
        },
      });
    } catch (error) {
      console.error('Error en POST /api/courses:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // ============================================
  // PUT /api/courses/:id - Actualizar curso
  // ============================================
  if (req.method === 'PUT' && id) {
    try {
      const { name, grade, section, year, isActive } = req.body;

      // Verificar que el curso existe
      const { data: existingCourse } = await supabaseAdmin
        .from('courses')
        .select('id')
        .eq('id', id)
        .single();

      if (!existingCourse) {
        return res.status(404).json({
          success: false,
          error: 'Curso no encontrado',
        });
      }

      // Construir objeto de actualización
      const updateData: Record<string, unknown> = {};
      if (name) updateData.name = name;
      if (grade) updateData.grade = grade;
      if (section) updateData.section = section;
      if (year) updateData.year = year;
      if (isActive !== undefined) updateData.is_active = isActive;

      const { data: updatedCourse, error } = await supabaseAdmin
        .from('courses')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error actualizando curso:', error);
        return res.status(500).json({
          success: false,
          error: 'Error al actualizar curso',
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          id: updatedCourse.id,
          name: updatedCourse.name,
          grade: updatedCourse.grade,
          section: updatedCourse.section,
          year: updatedCourse.year,
          isActive: updatedCourse.is_active,
        },
      });
    } catch (error) {
      console.error('Error en PUT /api/courses/:id:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // ============================================
  // DELETE /api/courses/:id - Eliminar curso
  // ============================================
  if (req.method === 'DELETE' && id) {
    try {
      // Verificar que el curso existe
      const { data: existingCourse } = await supabaseAdmin
        .from('courses')
        .select('id')
        .eq('id', id)
        .single();

      if (!existingCourse) {
        return res.status(404).json({
          success: false,
          error: 'Curso no encontrado',
        });
      }

      // Soft delete
      const { error } = await supabaseAdmin
        .from('courses')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        console.error('Error eliminando curso:', error);
        return res.status(500).json({
          success: false,
          error: 'Error al eliminar curso',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Curso eliminado correctamente',
      });
    } catch (error) {
      console.error('Error en DELETE /api/courses/:id:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
