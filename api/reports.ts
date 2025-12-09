// ============================================
// REPORTS API - Vercel Serverless Function
// ============================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Helper functions
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
  return [
    { id: 'c1', name: '3ro A', grade: '3ro Secundaria', totalStudents: 32, avgAttendance: 94.2, totalSessions: 52, perfectAttendance: 5, chronicAbsent: 2 },
    { id: 'c2', name: '3ro B', grade: '3ro Secundaria', totalStudents: 30, avgAttendance: 91.5, totalSessions: 52, perfectAttendance: 4, chronicAbsent: 1 },
    { id: 'c3', name: '4to A', grade: '4to Secundaria', totalStudents: 28, avgAttendance: 89.8, totalSessions: 48, perfectAttendance: 3, chronicAbsent: 2 },
    { id: 'c4', name: '4to B', grade: '4to Secundaria', totalStudents: 31, avgAttendance: 92.1, totalSessions: 48, perfectAttendance: 6, chronicAbsent: 1 },
    { id: 'c5', name: '5to A', grade: '5to Secundaria', totalStudents: 27, avgAttendance: 88.4, totalSessions: 45, perfectAttendance: 2, chronicAbsent: 3 },
  ];
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { type = 'dashboard', period = '7' } = req.query;

  try {
    if (type === 'dashboard') {
      const dailyData = generateDailyAttendance(7);
      const today = dailyData[dailyData.length - 1];
      const yesterday = dailyData[dailyData.length - 2];

      return res.status(200).json({
        success: true,
        data: {
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
          topAbsentStudents: [
            { id: '1', firstName: 'Carlos', lastName: 'Mendoza', course: '3ro A', absences: 12, lastAbsence: '2025-01-08' },
            { id: '2', firstName: 'María', lastName: 'González', course: '4to B', absences: 10, lastAbsence: '2025-01-07' },
            { id: '3', firstName: 'Juan', lastName: 'Rodríguez', course: '3ro B', absences: 8, lastAbsence: '2025-01-09' },
          ],
          coursePerformance: generateCourseAttendance(),
        },
      });
    }

    if (type === 'attendance') {
      const days = parseInt(period as string) || 7;
      const dailyData = generateDailyAttendance(days);
      const totalPresent = dailyData.reduce((sum, d) => sum + d.present, 0);
      const totalAbsent = dailyData.reduce((sum, d) => sum + d.absent, 0);
      const totalLate = dailyData.reduce((sum, d) => sum + d.late, 0);
      const avgAttendance = dailyData.reduce((sum, d) => sum + d.attendanceRate, 0) / dailyData.length;

      return res.status(200).json({
        success: true,
        data: {
          period: `${days} días`,
          summary: {
            totalPresent,
            totalAbsent,
            totalLate,
            avgAttendance: Math.round(avgAttendance * 10) / 10,
            bestDay: dailyData.reduce((best, d) => d.attendanceRate > best.attendanceRate ? d : best),
            worstDay: dailyData.reduce((worst, d) => d.attendanceRate < worst.attendanceRate ? d : worst),
          },
          daily: dailyData,
          hourlyDistribution: [
            { hour: '07:00', checkIns: 45, percentage: 12.5 },
            { hour: '08:00', checkIns: 120, percentage: 33.3 },
            { hour: '09:00', checkIns: 85, percentage: 23.6 },
            { hour: '10:00', checkIns: 60, percentage: 16.7 },
            { hour: '11:00', checkIns: 35, percentage: 9.7 },
            { hour: '12:00', checkIns: 15, percentage: 4.2 },
          ],
        },
      });
    }

    if (type === 'courses') {
      const courses = generateCourseAttendance();
      return res.status(200).json({
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
    }

    return res.status(400).json({ error: 'Tipo de reporte inválido' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Error al generar reporte' });
  }
}
