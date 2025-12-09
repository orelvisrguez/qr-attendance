// ============================================
// REPORTS API - Vercel Serverless Function
// Reportes de asistencia con Supabase
// ============================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin, isSupabaseConfigured } from './_lib/supabase.js';

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

// Obtener fecha hace N días
function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
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
      error: 'Base de datos no configurada.',
    });
  }

  const { type = 'dashboard', period = '7', courseId, profesorId } = req.query;

  try {
    // ============================================
    // Dashboard - Resumen general
    // ============================================
    if (type === 'dashboard') {
      // Obtener conteos generales
      const [usersResult, coursesResult, sessionsResult] = await Promise.all([
        supabaseAdmin.from('users').select('role, is_active'),
        supabaseAdmin.from('courses').select('id, is_active'),
        supabaseAdmin
          .from('attendance_sessions')
          .select('id')
          .eq('status', 'ACTIVE'),
      ]);

      const users = usersResult.data || [];
      const courses = coursesResult.data || [];
      const activeSessions = sessionsResult.data?.length || 0;

      // Obtener asistencias de hoy
      const today = new Date().toISOString().split('T')[0];
      const { data: todayAttendances } = await supabaseAdmin
        .from('attendances')
        .select('status, scanned_at')
        .gte('scanned_at', `${today}T00:00:00`)
        .lte('scanned_at', `${today}T23:59:59`);

      const todayStats = todayAttendances || [];
      const todayPresent = todayStats.filter((a) => a.status === 'PRESENTE').length;
      const todayLate = todayStats.filter((a) => a.status === 'TARDANZA').length;
      const todayAbsent = todayStats.filter((a) => a.status === 'AUSENTE').length;
      const totalToday = todayPresent + todayLate + todayAbsent;

      // Obtener tendencia semanal
      const days = 7;
      const weeklyData = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const { data: dayAttendances } = await supabaseAdmin
          .from('attendances')
          .select('status')
          .gte('scanned_at', `${dateStr}T00:00:00`)
          .lte('scanned_at', `${dateStr}T23:59:59`);

        const dayData = dayAttendances || [];
        const present = dayData.filter((a) => a.status === 'PRESENTE').length;
        const late = dayData.filter((a) => a.status === 'TARDANZA').length;
        const absent = dayData.filter((a) => a.status === 'AUSENTE').length;
        const total = present + late + absent;

        weeklyData.push({
          date: dateStr,
          dayName: date.toLocaleDateString('es-ES', { weekday: 'short' }),
          present,
          absent,
          late,
          total,
          attendanceRate: total > 0 ? Math.round(((present + late) / total) * 100 * 10) / 10 : 0,
        });
      }

      // Estudiantes con más ausencias
      const { data: topAbsent } = await supabaseAdmin
        .from('attendances')
        .select(`
          student_id,
          status,
          student:users!student_id (
            id,
            first_name,
            last_name
          )
        `)
        .eq('status', 'AUSENTE')
        .gte('scanned_at', getDateDaysAgo(30));

      const absenceCount: Record<string, { count: number; student: { id: string; first_name: string; last_name: string } | null }> = {};
      (topAbsent || []).forEach((a: { student_id: string; student: { id: string; first_name: string; last_name: string } | null }) => {
        if (!absenceCount[a.student_id]) {
          absenceCount[a.student_id] = { count: 0, student: a.student };
        }
        absenceCount[a.student_id].count++;
      });

      const topAbsentStudents = Object.entries(absenceCount)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 5)
        .map(([studentId, data]) => ({
          id: studentId,
          firstName: data.student?.first_name || 'Desconocido',
          lastName: data.student?.last_name || '',
          absences: data.count,
        }));

      // Rendimiento por curso
      const { data: coursesData } = await supabaseAdmin
        .from('courses')
        .select('id, name, grade')
        .eq('is_active', true);

      const coursePerformance = await Promise.all(
        (coursesData || []).map(async (course) => {
          const { data: sessions } = await supabaseAdmin
            .from('attendance_sessions')
            .select('id')
            .eq('course_id', course.id);

          const sessionIds = sessions?.map((s) => s.id) || [];

          if (sessionIds.length === 0) {
            return {
              id: course.id,
              name: course.name,
              grade: course.grade,
              totalSessions: 0,
              avgAttendance: 0,
            };
          }

          const { data: attendances } = await supabaseAdmin
            .from('attendances')
            .select('status')
            .in('session_id', sessionIds);

          const total = attendances?.length || 0;
          const present = attendances?.filter((a) => a.status === 'PRESENTE' || a.status === 'TARDANZA').length || 0;

          return {
            id: course.id,
            name: course.name,
            grade: course.grade,
            totalSessions: sessionIds.length,
            avgAttendance: total > 0 ? Math.round((present / total) * 100 * 10) / 10 : 0,
          };
        })
      );

      return res.status(200).json({
        success: true,
        data: {
          summary: {
            totalStudents: users.filter((u) => u.role === 'ALUMNO' && u.is_active).length,
            totalProfesors: users.filter((u) => u.role === 'PROFESOR' && u.is_active).length,
            totalCourses: courses.filter((c) => c.is_active).length,
            activeSessions,
          },
          today: {
            present: todayPresent,
            absent: todayAbsent,
            late: todayLate,
            attendanceRate: totalToday > 0 ? Math.round(((todayPresent + todayLate) / totalToday) * 100 * 10) / 10 : 0,
          },
          weeklyTrend: weeklyData,
          topAbsentStudents,
          coursePerformance,
        },
      });
    }

    // ============================================
    // Attendance - Reporte detallado de asistencia
    // ============================================
    if (type === 'attendance') {
      const days = parseInt(period as string) || 7;
      const startDate = getDateDaysAgo(days);

      let query = supabaseAdmin
        .from('attendances')
        .select(`
          id,
          status,
          scanned_at,
          session:attendance_sessions!session_id (
            id,
            course_id,
            started_at,
            course:courses!course_id (
              id,
              name,
              grade
            )
          ),
          student:users!student_id (
            id,
            first_name,
            last_name
          )
        `)
        .gte('scanned_at', `${startDate}T00:00:00`)
        .order('scanned_at', { ascending: false });

      if (courseId) {
        query = query.eq('session.course_id', courseId);
      }

      const { data: attendances, error } = await query;

      if (error) {
        console.error('Error obteniendo asistencias:', error);
        return res.status(500).json({
          success: false,
          error: 'Error al obtener datos de asistencia',
        });
      }

      const data = attendances || [];
      const totalPresent = data.filter((a) => a.status === 'PRESENTE').length;
      const totalLate = data.filter((a) => a.status === 'TARDANZA').length;
      const totalAbsent = data.filter((a) => a.status === 'AUSENTE').length;

      // Agrupar por día
      const dailyData: Record<string, { present: number; late: number; absent: number }> = {};
      data.forEach((a) => {
        const date = a.scanned_at.split('T')[0];
        if (!dailyData[date]) {
          dailyData[date] = { present: 0, late: 0, absent: 0 };
        }
        if (a.status === 'PRESENTE') dailyData[date].present++;
        else if (a.status === 'TARDANZA') dailyData[date].late++;
        else if (a.status === 'AUSENTE') dailyData[date].absent++;
      });

      const daily = Object.entries(dailyData).map(([date, stats]) => ({
        date,
        ...stats,
        total: stats.present + stats.late + stats.absent,
        attendanceRate: Math.round(((stats.present + stats.late) / (stats.present + stats.late + stats.absent)) * 100 * 10) / 10,
      }));

      return res.status(200).json({
        success: true,
        data: {
          period: `${days} días`,
          summary: {
            totalPresent,
            totalLate,
            totalAbsent,
            avgAttendance: data.length > 0
              ? Math.round(((totalPresent + totalLate) / data.length) * 100 * 10) / 10
              : 0,
          },
          daily: daily.sort((a, b) => a.date.localeCompare(b.date)),
          records: data.slice(0, 100).map((a) => ({
            id: a.id,
            studentName: a.student ? `${a.student.first_name} ${a.student.last_name}` : 'Desconocido',
            courseName: a.session?.course?.name || 'N/A',
            status: a.status,
            scannedAt: a.scanned_at,
          })),
        },
      });
    }

    // ============================================
    // Courses - Rendimiento por cursos
    // ============================================
    if (type === 'courses') {
      const { data: courses, error } = await supabaseAdmin
        .from('courses')
        .select('id, name, grade, section')
        .eq('is_active', true);

      if (error) {
        console.error('Error obteniendo cursos:', error);
        return res.status(500).json({
          success: false,
          error: 'Error al obtener cursos',
        });
      }

      const courseStats = await Promise.all(
        (courses || []).map(async (course) => {
          // Contar estudiantes
          const { count: studentCount } = await supabaseAdmin
            .from('course_students')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', course.id);

          // Obtener sesiones
          const { data: sessions } = await supabaseAdmin
            .from('attendance_sessions')
            .select('id')
            .eq('course_id', course.id);

          const sessionIds = sessions?.map((s) => s.id) || [];
          let avgAttendance = 0;
          let perfectAttendance = 0;
          let chronicAbsent = 0;

          if (sessionIds.length > 0) {
            const { data: attendances } = await supabaseAdmin
              .from('attendances')
              .select('student_id, status')
              .in('session_id', sessionIds);

            const total = attendances?.length || 0;
            const present = attendances?.filter((a) => a.status === 'PRESENTE' || a.status === 'TARDANZA').length || 0;
            avgAttendance = total > 0 ? Math.round((present / total) * 100 * 10) / 10 : 0;

            // Calcular asistencia perfecta y ausencias crónicas por estudiante
            const studentStats: Record<string, { present: number; total: number }> = {};
            (attendances || []).forEach((a) => {
              if (!studentStats[a.student_id]) {
                studentStats[a.student_id] = { present: 0, total: 0 };
              }
              studentStats[a.student_id].total++;
              if (a.status === 'PRESENTE' || a.status === 'TARDANZA') {
                studentStats[a.student_id].present++;
              }
            });

            Object.values(studentStats).forEach((stats) => {
              const rate = stats.present / stats.total;
              if (rate === 1) perfectAttendance++;
              if (rate < 0.8) chronicAbsent++;
            });
          }

          return {
            id: course.id,
            name: course.name,
            grade: course.grade,
            section: course.section,
            totalStudents: studentCount || 0,
            avgAttendance,
            totalSessions: sessionIds.length,
            perfectAttendance,
            chronicAbsent,
          };
        })
      );

      return res.status(200).json({
        success: true,
        data: {
          courses: courseStats,
          summary: {
            totalCourses: courseStats.length,
            avgAttendance: courseStats.length > 0
              ? Math.round(courseStats.reduce((sum, c) => sum + c.avgAttendance, 0) / courseStats.length * 10) / 10
              : 0,
            bestCourse: courseStats.reduce((best, c) => c.avgAttendance > (best?.avgAttendance || 0) ? c : best, courseStats[0]),
            worstCourse: courseStats.reduce((worst, c) => c.avgAttendance < (worst?.avgAttendance || 100) ? c : worst, courseStats[0]),
          },
        },
      });
    }

    // ============================================
    // Student - Reporte individual de estudiante
    // ============================================
    if (type === 'student') {
      const { studentId } = req.query;

      if (!studentId) {
        return res.status(400).json({
          success: false,
          error: 'studentId es requerido',
        });
      }

      const { data: student } = await supabaseAdmin
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('id', studentId)
        .single();

      if (!student) {
        return res.status(404).json({
          success: false,
          error: 'Estudiante no encontrado',
        });
      }

      const { data: attendances } = await supabaseAdmin
        .from('attendances')
        .select(`
          id,
          status,
          scanned_at,
          session:attendance_sessions!session_id (
            course:courses!course_id (
              name
            ),
            subject:subjects!subject_id (
              name
            )
          )
        `)
        .eq('student_id', studentId)
        .order('scanned_at', { ascending: false });

      const data = attendances || [];
      const present = data.filter((a) => a.status === 'PRESENTE').length;
      const late = data.filter((a) => a.status === 'TARDANZA').length;
      const absent = data.filter((a) => a.status === 'AUSENTE').length;

      return res.status(200).json({
        success: true,
        data: {
          student: {
            id: student.id,
            name: `${student.first_name} ${student.last_name}`,
            email: student.email,
          },
          summary: {
            totalClasses: data.length,
            present,
            late,
            absent,
            attendanceRate: data.length > 0
              ? Math.round(((present + late) / data.length) * 100 * 10) / 10
              : 0,
          },
          records: data.slice(0, 50).map((a) => ({
            id: a.id,
            courseName: a.session?.course?.name || 'N/A',
            subjectName: a.session?.subject?.name || 'N/A',
            status: a.status,
            scannedAt: a.scanned_at,
          })),
        },
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Tipo de reporte inválido',
    });
  } catch (error) {
    console.error('Error en GET /api/reports:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
}
