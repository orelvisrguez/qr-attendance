// ============================================
// REPORTS API ROUTES
// Endpoints para reportes y estadísticas
// ============================================

import { Router, Request, Response } from 'express';

const router = Router();

// ============================================
// MOCK DATA GENERATORS
// ============================================

const generateDailyAttendance = (days: number) => {
  const data = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const total = 342;
    const present = Math.floor(total * (0.85 + Math.random() * 0.12));
    const absent = total - present;
    const late = Math.floor(present * (0.03 + Math.random() * 0.05));

    data.push({
      date: date.toISOString().split('T')[0],
      dayName: date.toLocaleDateString('es-ES', { weekday: 'short' }),
      present,
      absent,
      late,
      total,
      attendanceRate: Math.round((present / total) * 100 * 10) / 10,
    });
  }

  return data;
};

const generateCourseAttendance = () => {
  const courses = [
    { id: 'c1', name: '3ro A', grade: '3ro Secundaria' },
    { id: 'c2', name: '3ro B', grade: '3ro Secundaria' },
    { id: 'c3', name: '4to A', grade: '4to Secundaria' },
    { id: 'c4', name: '4to B', grade: '4to Secundaria' },
    { id: 'c5', name: '5to A', grade: '5to Secundaria' },
  ];

  return courses.map(course => {
    const totalStudents = 25 + Math.floor(Math.random() * 15);
    const avgAttendance = 85 + Math.random() * 12;

    return {
      ...course,
      totalStudents,
      avgAttendance: Math.round(avgAttendance * 10) / 10,
      totalSessions: 45 + Math.floor(Math.random() * 20),
      perfectAttendance: Math.floor(totalStudents * 0.15),
      chronicAbsent: Math.floor(totalStudents * 0.05),
    };
  });
};

const generateSubjectAttendance = () => {
  const subjects = [
    { id: 's1', name: 'Matemáticas', code: 'MAT' },
    { id: 's2', name: 'Física', code: 'FIS' },
    { id: 's3', name: 'Química', code: 'QUI' },
    { id: 's4', name: 'Historia', code: 'HIS' },
    { id: 's5', name: 'Lengua', code: 'LEN' },
    { id: 's6', name: 'Inglés', code: 'ING' },
    { id: 's7', name: 'Biología', code: 'BIO' },
    { id: 's8', name: 'Ed. Física', code: 'EDF' },
  ];

  return subjects.map(subject => ({
    ...subject,
    avgAttendance: Math.round((82 + Math.random() * 15) * 10) / 10,
    totalSessions: 30 + Math.floor(Math.random() * 20),
    totalStudents: 150 + Math.floor(Math.random() * 100),
  }));
};

const generateTopAbsentStudents = () => {
  const names = [
    { firstName: 'Carlos', lastName: 'Mendoza' },
    { firstName: 'María', lastName: 'González' },
    { firstName: 'Juan', lastName: 'Rodríguez' },
    { firstName: 'Ana', lastName: 'Martínez' },
    { firstName: 'Pedro', lastName: 'López' },
    { firstName: 'Laura', lastName: 'García' },
    { firstName: 'Diego', lastName: 'Hernández' },
    { firstName: 'Sofía', lastName: 'Díaz' },
    { firstName: 'Miguel', lastName: 'Torres' },
    { firstName: 'Valentina', lastName: 'Ruiz' },
  ];

  return names.map((name, i) => ({
    id: `stu${i + 1}`,
    ...name,
    course: `${3 + Math.floor(i / 3)}ro ${['A', 'B'][i % 2]}`,
    absences: 12 - i + Math.floor(Math.random() * 3),
    lastAbsence: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  }));
};

const generateHourlyDistribution = () => {
  const hours = [];
  for (let h = 7; h <= 14; h++) {
    const hourStr = `${h.toString().padStart(2, '0')}:00`;
    const checkIns = Math.floor(20 + Math.random() * 80);
    hours.push({
      hour: hourStr,
      checkIns,
      percentage: 0, // Will be calculated
    });
  }

  const total = hours.reduce((sum, h) => sum + h.checkIns, 0);
  hours.forEach(h => {
    h.percentage = Math.round((h.checkIns / total) * 100 * 10) / 10;
  });

  return hours;
};

const generateWeeklyComparison = () => {
  const weeks = [];
  const today = new Date();

  for (let w = 3; w >= 0; w--) {
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - (w * 7) - weekStart.getDay());

    weeks.push({
      weekNumber: getWeekNumber(weekStart),
      weekStart: weekStart.toISOString().split('T')[0],
      avgAttendance: Math.round((88 + Math.random() * 8) * 10) / 10,
      totalPresent: 1500 + Math.floor(Math.random() * 200),
      totalAbsent: 80 + Math.floor(Math.random() * 40),
    });
  }

  return weeks;
};

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// ============================================
// REPORTS ENDPOINTS
// ============================================

// GET /api/reports/dashboard - Resumen general del dashboard
router.get('/dashboard', (_req: Request, res: Response) => {
  try {
    const dailyData = generateDailyAttendance(7);
    const today = dailyData[dailyData.length - 1];
    const yesterday = dailyData[dailyData.length - 2];

    const dashboard = {
      summary: {
        totalStudents: 342,
        totalProfesors: 28,
        totalCourses: 12,
        activeSessions: Math.floor(Math.random() * 8) + 2,
      },
      today: {
        present: today.present,
        absent: today.absent,
        late: today.late,
        attendanceRate: today.attendanceRate,
        changeFromYesterday: Math.round((today.attendanceRate - yesterday.attendanceRate) * 10) / 10,
      },
      weeklyTrend: dailyData,
      topAbsentStudents: generateTopAbsentStudents().slice(0, 5),
      coursePerformance: generateCourseAttendance().slice(0, 5),
    };

    res.json({ success: true, data: dashboard });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al generar dashboard' });
  }
});

// GET /api/reports/attendance - Reporte de asistencia detallado
router.get('/attendance', (req: Request, res: Response) => {
  try {
    const { period = '7', groupBy = 'day' } = req.query;
    const days = parseInt(period as string) || 7;

    const dailyData = generateDailyAttendance(days);

    // Calculate summary stats
    const totalPresent = dailyData.reduce((sum, d) => sum + d.present, 0);
    const totalAbsent = dailyData.reduce((sum, d) => sum + d.absent, 0);
    const totalLate = dailyData.reduce((sum, d) => sum + d.late, 0);
    const avgAttendance = dailyData.reduce((sum, d) => sum + d.attendanceRate, 0) / dailyData.length;

    res.json({
      success: true,
      data: {
        period: `${days} días`,
        groupBy,
        summary: {
          totalPresent,
          totalAbsent,
          totalLate,
          avgAttendance: Math.round(avgAttendance * 10) / 10,
          bestDay: dailyData.reduce((best, d) => d.attendanceRate > best.attendanceRate ? d : best),
          worstDay: dailyData.reduce((worst, d) => d.attendanceRate < worst.attendanceRate ? d : worst),
        },
        daily: dailyData,
        hourlyDistribution: generateHourlyDistribution(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al generar reporte' });
  }
});

// GET /api/reports/courses - Reporte por cursos
router.get('/courses', (_req: Request, res: Response) => {
  try {
    const courses = generateCourseAttendance();

    res.json({
      success: true,
      data: {
        courses,
        summary: {
          totalCourses: courses.length,
          avgAttendance: Math.round(courses.reduce((sum, c) => sum + c.avgAttendance, 0) / courses.length * 10) / 10,
          bestCourse: courses.reduce((best, c) => c.avgAttendance > best.avgAttendance ? c : best),
          worstCourse: courses.reduce((worst, c) => c.avgAttendance < worst.avgAttendance ? c : worst),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al generar reporte de cursos' });
  }
});

// GET /api/reports/subjects - Reporte por materias
router.get('/subjects', (_req: Request, res: Response) => {
  try {
    const subjects = generateSubjectAttendance();

    res.json({
      success: true,
      data: {
        subjects,
        summary: {
          totalSubjects: subjects.length,
          avgAttendance: Math.round(subjects.reduce((sum, s) => sum + s.avgAttendance, 0) / subjects.length * 10) / 10,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al generar reporte de materias' });
  }
});

// GET /api/reports/students/absent - Estudiantes con más ausencias
router.get('/students/absent', (_req: Request, res: Response) => {
  try {
    const students = generateTopAbsentStudents();

    res.json({
      success: true,
      data: {
        students,
        summary: {
          totalChronicAbsent: students.filter(s => s.absences >= 10).length,
          avgAbsences: Math.round(students.reduce((sum, s) => sum + s.absences, 0) / students.length * 10) / 10,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al generar reporte de ausencias' });
  }
});

// GET /api/reports/weekly - Comparación semanal
router.get('/weekly', (_req: Request, res: Response) => {
  try {
    const weeks = generateWeeklyComparison();

    res.json({
      success: true,
      data: {
        weeks,
        trend: weeks[weeks.length - 1].avgAttendance > weeks[0].avgAttendance ? 'improving' : 'declining',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al generar comparación semanal' });
  }
});

// GET /api/reports/export - Exportar reporte (simulated)
router.get('/export', (req: Request, res: Response) => {
  try {
    const { format = 'json', type = 'attendance' } = req.query;

    // In a real app, this would generate actual PDF/Excel files
    // For now, we return the data with metadata

    const reportData = {
      generatedAt: new Date().toISOString(),
      format,
      type,
      data: type === 'attendance'
        ? generateDailyAttendance(30)
        : type === 'courses'
        ? generateCourseAttendance()
        : generateTopAbsentStudents(),
    };

    res.json({
      success: true,
      message: `Reporte de ${type} generado en formato ${format}`,
      data: reportData,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al exportar reporte' });
  }
});

export default router;
