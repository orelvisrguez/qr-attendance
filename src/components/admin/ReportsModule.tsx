// ============================================
// REPORTS MODULE COMPONENT
// Módulo completo de reportes y estadísticas
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../lib/api';

// ============================================
// TYPES
// ============================================

interface DailyAttendance {
  date: string;
  dayName: string;
  present: number;
  absent: number;
  late: number;
  total: number;
  attendanceRate: number;
}

interface CourseStats {
  id: string;
  name: string;
  grade: string;
  totalStudents: number;
  avgAttendance: number;
  totalSessions: number;
  perfectAttendance: number;
  chronicAbsent: number;
}

interface SubjectStats {
  id: string;
  name: string;
  code: string;
  avgAttendance: number;
  totalSessions: number;
  totalStudents: number;
}

interface AbsentStudent {
  id: string;
  firstName: string;
  lastName: string;
  course: string;
  absences: number;
  lastAbsence: string;
}

interface HourlyData {
  hour: string;
  checkIns: number;
  percentage: number;
}

type ReportView = 'overview' | 'attendance' | 'courses' | 'subjects' | 'students';
type PeriodFilter = '7' | '14' | '30' | '90';

// ============================================
// SUB-COMPONENTS
// ============================================

const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'purple' | 'blue' | 'green' | 'red' | 'yellow';
  trend?: { value: number; isPositive: boolean };
}> = ({ title, value, subtitle, icon, color, trend }) => {
  const colorClasses = {
    purple: 'bg-purple-500/20 text-purple-400',
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    red: 'bg-red-500/20 text-red-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
  };

  return (
    <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
          {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
          {trend && (
            <p className={`text-sm mt-2 flex items-center gap-1 ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
              <svg className={`w-4 h-4 ${trend.isPositive ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              {Math.abs(trend.value)}% vs ayer
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const MiniBarChart: React.FC<{ data: DailyAttendance[] }> = ({ data }) => {
  const maxRate = Math.max(...data.map(d => d.attendanceRate));

  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((day, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full bg-purple-500 rounded-t transition-all hover:bg-purple-400"
            style={{ height: `${(day.attendanceRate / maxRate) * 100}%` }}
            title={`${day.date}: ${day.attendanceRate}%`}
          />
          <span className="text-gray-500 text-xs">{day.dayName}</span>
        </div>
      ))}
    </div>
  );
};

const ProgressBar: React.FC<{ value: number; color?: string }> = ({ value, color = 'purple' }) => {
  const colorClass = {
    purple: 'bg-purple-500',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
  }[color] || 'bg-purple-500';

  return (
    <div className="w-full bg-slate-700 rounded-full h-2">
      <div
        className={`${colorClass} h-2 rounded-full transition-all`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const ReportsModule: React.FC = () => {
  const [activeView, setActiveView] = useState<ReportView>('overview');
  const [period, setPeriod] = useState<PeriodFilter>('7');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [dailyData, setDailyData] = useState<DailyAttendance[]>([]);
  const [coursesData, setCoursesData] = useState<CourseStats[]>([]);
  const [subjectsData, setSubjectsData] = useState<SubjectStats[]>([]);
  const [absentStudents, setAbsentStudents] = useState<AbsentStudent[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [summary, setSummary] = useState<any>(null);

  // Fetch data based on active view
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (activeView === 'overview') {
        const res = await fetch(`${API_URL}/api/reports/dashboard`);
        const data = await res.json();
        if (data.success) {
          setDailyData(data.data.weeklyTrend);
          setAbsentStudents(data.data.topAbsentStudents);
          setCoursesData(data.data.coursePerformance);
          setSummary(data.data);
        }
      } else if (activeView === 'attendance') {
        const res = await fetch(`${API_URL}/api/reports/attendance?period=${period}`);
        const data = await res.json();
        if (data.success) {
          setDailyData(data.data.daily);
          setHourlyData(data.data.hourlyDistribution);
          setSummary(data.data.summary);
        }
      } else if (activeView === 'courses') {
        const res = await fetch(`${API_URL}/api/reports/courses`);
        const data = await res.json();
        if (data.success) {
          setCoursesData(data.data.courses);
          setSummary(data.data.summary);
        }
      } else if (activeView === 'subjects') {
        const res = await fetch(`${API_URL}/api/reports/subjects`);
        const data = await res.json();
        if (data.success) {
          setSubjectsData(data.data.subjects);
          setSummary(data.data.summary);
        }
      } else if (activeView === 'students') {
        const res = await fetch(`${API_URL}/api/reports/students/absent`);
        const data = await res.json();
        if (data.success) {
          setAbsentStudents(data.data.students);
          setSummary(data.data.summary);
        }
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    } finally {
      setIsLoading(false);
    }
  }, [activeView, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      const res = await fetch(`${API_URL}/api/reports/export?format=${format}&type=${activeView}`);
      const data = await res.json();
      if (data.success) {
        // In a real app, this would download the file
        alert(`Reporte exportado en formato ${format.toUpperCase()}`);
      }
    } catch (err) {
      setError('Error al exportar');
    }
  };

  // View tabs
  const viewTabs = [
    { id: 'overview', label: 'Resumen', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'attendance', label: 'Asistencia', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'courses', label: 'Por Curso', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { id: 'subjects', label: 'Por Materia', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { id: 'students', label: 'Ausencias', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  ];

  return (
    <div className="space-y-6">
      {/* View Tabs & Controls */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {viewTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as ReportView)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activeView === tab.id
                    ? 'bg-purple-500 text-white'
                    : 'bg-slate-700 text-gray-400 hover:bg-slate-600 hover:text-white'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            {activeView === 'attendance' && (
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
                className="px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="7">Últimos 7 días</option>
                <option value="14">Últimos 14 días</option>
                <option value="30">Últimos 30 días</option>
                <option value="90">Últimos 90 días</option>
              </select>
            )}

            {/* Export Dropdown */}
            <div className="relative group">
              <button className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Exportar
              </button>
              <div className="absolute right-0 mt-2 w-40 bg-slate-800 border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full px-4 py-2 text-left text-white hover:bg-white/10 rounded-t-lg flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                  PDF
                </button>
                <button
                  onClick={() => handleExport('excel')}
                  className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                  Excel
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full px-4 py-2 text-left text-white hover:bg-white/10 rounded-b-lg flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                  CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="float-right">&times;</button>
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* OVERVIEW VIEW */}
          {activeView === 'overview' && summary && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Asistencia Hoy"
                  value={`${summary.today?.attendanceRate || 0}%`}
                  icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  color="green"
                  trend={summary.today?.changeFromYesterday ? { value: summary.today.changeFromYesterday, isPositive: summary.today.changeFromYesterday > 0 } : undefined}
                />
                <StatCard
                  title="Presentes"
                  value={summary.today?.present || 0}
                  subtitle={`de ${summary.summary?.totalStudents || 0} alumnos`}
                  icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                  color="blue"
                />
                <StatCard
                  title="Ausentes"
                  value={summary.today?.absent || 0}
                  subtitle="requieren seguimiento"
                  icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>}
                  color="red"
                />
                <StatCard
                  title="Sesiones Activas"
                  value={summary.summary?.activeSessions || 0}
                  subtitle="en este momento"
                  icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  color="purple"
                />
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Weekly Trend */}
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-4">Tendencia Semanal</h3>
                  <MiniBarChart data={dailyData} />
                </div>

                {/* Top Courses */}
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-4">Rendimiento por Curso</h3>
                  <div className="space-y-3">
                    {coursesData.slice(0, 5).map((course) => (
                      <div key={course.id} className="flex items-center gap-3">
                        <span className="text-white text-sm w-16 shrink-0">{course.name}</span>
                        <div className="flex-1">
                          <ProgressBar
                            value={course.avgAttendance}
                            color={course.avgAttendance >= 90 ? 'green' : course.avgAttendance >= 80 ? 'blue' : 'yellow'}
                          />
                        </div>
                        <span className="text-gray-400 text-sm w-12 text-right">{course.avgAttendance}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Absent Students Table */}
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-700">
                  <h3 className="text-lg font-semibold text-white">Estudiantes con Más Ausencias</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700 bg-slate-800/50">
                        <th className="text-left p-4 text-gray-400 font-medium">Estudiante</th>
                        <th className="text-left p-4 text-gray-400 font-medium">Curso</th>
                        <th className="text-left p-4 text-gray-400 font-medium">Ausencias</th>
                        <th className="text-left p-4 text-gray-400 font-medium">Última Ausencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {absentStudents.slice(0, 5).map((student) => (
                        <tr key={student.id} className="border-b border-slate-700/50 hover:bg-white/5">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center text-sm font-semibold">
                                {student.firstName[0]}{student.lastName[0]}
                              </div>
                              <span className="text-white">{student.firstName} {student.lastName}</span>
                            </div>
                          </td>
                          <td className="p-4 text-gray-400">{student.course}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              student.absences >= 10 ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {student.absences} faltas
                            </span>
                          </td>
                          <td className="p-4 text-gray-400">{student.lastAbsence}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ATTENDANCE VIEW */}
          {activeView === 'attendance' && summary && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Promedio Asistencia"
                  value={`${summary.avgAttendance}%`}
                  subtitle={`Período: ${period} días`}
                  icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                  color="purple"
                />
                <StatCard
                  title="Total Presentes"
                  value={summary.totalPresent?.toLocaleString() || 0}
                  icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                  color="green"
                />
                <StatCard
                  title="Total Ausentes"
                  value={summary.totalAbsent?.toLocaleString() || 0}
                  icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>}
                  color="red"
                />
                <StatCard
                  title="Total Tardanzas"
                  value={summary.totalLate?.toLocaleString() || 0}
                  icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  color="yellow"
                />
              </div>

              {/* Best/Worst Days */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-500/20 text-green-400 rounded-lg">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                    </div>
                    <h3 className="text-white font-semibold">Mejor Día</h3>
                  </div>
                  <p className="text-3xl font-bold text-green-400">{summary.bestDay?.attendanceRate}%</p>
                  <p className="text-gray-400 text-sm mt-1">{summary.bestDay?.date}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-red-500/20 text-red-400 rounded-lg">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </div>
                    <h3 className="text-white font-semibold">Peor Día</h3>
                  </div>
                  <p className="text-3xl font-bold text-red-400">{summary.worstDay?.attendanceRate}%</p>
                  <p className="text-gray-400 text-sm mt-1">{summary.worstDay?.date}</p>
                </div>
              </div>

              {/* Daily Chart */}
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">Asistencia Diaria</h3>
                <div className="h-48">
                  <MiniBarChart data={dailyData} />
                </div>
              </div>

              {/* Hourly Distribution */}
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">Distribución por Hora</h3>
                <div className="space-y-3">
                  {hourlyData.map((hour) => (
                    <div key={hour.hour} className="flex items-center gap-3">
                      <span className="text-white text-sm w-14 shrink-0">{hour.hour}</span>
                      <div className="flex-1">
                        <ProgressBar value={hour.percentage * 2} color="blue" />
                      </div>
                      <span className="text-gray-400 text-sm w-20 text-right">{hour.checkIns} registros</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Daily Table */}
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-700">
                  <h3 className="text-lg font-semibold text-white">Detalle Diario</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700 bg-slate-800/50">
                        <th className="text-left p-4 text-gray-400 font-medium">Fecha</th>
                        <th className="text-right p-4 text-gray-400 font-medium">Presentes</th>
                        <th className="text-right p-4 text-gray-400 font-medium">Ausentes</th>
                        <th className="text-right p-4 text-gray-400 font-medium">Tardanzas</th>
                        <th className="text-right p-4 text-gray-400 font-medium">% Asistencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyData.map((day) => (
                        <tr key={day.date} className="border-b border-slate-700/50 hover:bg-white/5">
                          <td className="p-4 text-white">{day.date} ({day.dayName})</td>
                          <td className="p-4 text-right text-green-400">{day.present}</td>
                          <td className="p-4 text-right text-red-400">{day.absent}</td>
                          <td className="p-4 text-right text-yellow-400">{day.late}</td>
                          <td className="p-4 text-right">
                            <span className={`px-2 py-1 rounded text-sm font-medium ${
                              day.attendanceRate >= 90 ? 'bg-green-500/20 text-green-400' :
                              day.attendanceRate >= 80 ? 'bg-blue-500/20 text-blue-400' :
                              'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {day.attendanceRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* COURSES VIEW */}
          {activeView === 'courses' && (
            <>
              {/* Summary */}
              {summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <StatCard
                    title="Total Cursos"
                    value={summary.totalCourses}
                    icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
                    color="purple"
                  />
                  <StatCard
                    title="Promedio General"
                    value={`${summary.avgAttendance}%`}
                    icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                    color="blue"
                  />
                  <StatCard
                    title="Mejor Curso"
                    value={summary.bestCourse?.name || '-'}
                    subtitle={`${summary.bestCourse?.avgAttendance || 0}%`}
                    icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>}
                    color="green"
                  />
                  <StatCard
                    title="Requiere Atención"
                    value={summary.worstCourse?.name || '-'}
                    subtitle={`${summary.worstCourse?.avgAttendance || 0}%`}
                    icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                    color="yellow"
                  />
                </div>
              )}

              {/* Courses Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {coursesData.map((course) => (
                  <div key={course.id} className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-white font-semibold text-lg">{course.name}</h3>
                        <p className="text-gray-400 text-sm">{course.grade}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        course.avgAttendance >= 90 ? 'bg-green-500/20 text-green-400' :
                        course.avgAttendance >= 80 ? 'bg-blue-500/20 text-blue-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {course.avgAttendance}%
                      </span>
                    </div>

                    <ProgressBar
                      value={course.avgAttendance}
                      color={course.avgAttendance >= 90 ? 'green' : course.avgAttendance >= 80 ? 'blue' : 'yellow'}
                    />

                    <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                      <div>
                        <p className="text-gray-400 text-xs">Alumnos</p>
                        <p className="text-white font-semibold">{course.totalStudents}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Sesiones</p>
                        <p className="text-white font-semibold">{course.totalSessions}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Perfectos</p>
                        <p className="text-green-400 font-semibold">{course.perfectAttendance}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* SUBJECTS VIEW */}
          {activeView === 'subjects' && (
            <>
              {summary && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <StatCard
                    title="Total Materias"
                    value={summary.totalSubjects}
                    icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                    color="purple"
                  />
                  <StatCard
                    title="Promedio General"
                    value={`${summary.avgAttendance}%`}
                    icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                    color="blue"
                  />
                </div>
              )}

              {/* Subjects Table */}
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700 bg-slate-800/50">
                        <th className="text-left p-4 text-gray-400 font-medium">Materia</th>
                        <th className="text-left p-4 text-gray-400 font-medium">Código</th>
                        <th className="text-right p-4 text-gray-400 font-medium">Sesiones</th>
                        <th className="text-right p-4 text-gray-400 font-medium">Alumnos</th>
                        <th className="text-right p-4 text-gray-400 font-medium">% Asistencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjectsData.map((subject) => (
                        <tr key={subject.id} className="border-b border-slate-700/50 hover:bg-white/5">
                          <td className="p-4 text-white font-medium">{subject.name}</td>
                          <td className="p-4 text-gray-400">{subject.code}</td>
                          <td className="p-4 text-right text-gray-400">{subject.totalSessions}</td>
                          <td className="p-4 text-right text-gray-400">{subject.totalStudents}</td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-20">
                                <ProgressBar
                                  value={subject.avgAttendance}
                                  color={subject.avgAttendance >= 90 ? 'green' : subject.avgAttendance >= 80 ? 'blue' : 'yellow'}
                                />
                              </div>
                              <span className="text-white text-sm w-12">{subject.avgAttendance}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* STUDENTS (ABSENCES) VIEW */}
          {activeView === 'students' && (
            <>
              {summary && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <StatCard
                    title="Ausentes Crónicos"
                    value={summary.totalChronicAbsent}
                    subtitle="10+ ausencias"
                    icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                    color="red"
                  />
                  <StatCard
                    title="Promedio Ausencias"
                    value={summary.avgAbsences}
                    subtitle="por estudiante en riesgo"
                    icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                    color="yellow"
                  />
                </div>
              )}

              {/* Students Table */}
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-700">
                  <h3 className="text-lg font-semibold text-white">Estudiantes con Mayor Cantidad de Ausencias</h3>
                  <p className="text-gray-400 text-sm">Ordenados por número de faltas</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700 bg-slate-800/50">
                        <th className="text-left p-4 text-gray-400 font-medium">#</th>
                        <th className="text-left p-4 text-gray-400 font-medium">Estudiante</th>
                        <th className="text-left p-4 text-gray-400 font-medium">Curso</th>
                        <th className="text-center p-4 text-gray-400 font-medium">Ausencias</th>
                        <th className="text-left p-4 text-gray-400 font-medium">Última Ausencia</th>
                        <th className="text-center p-4 text-gray-400 font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {absentStudents.map((student, index) => (
                        <tr key={student.id} className="border-b border-slate-700/50 hover:bg-white/5">
                          <td className="p-4 text-gray-500">{index + 1}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                                student.absences >= 10 ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                              }`}>
                                {student.firstName[0]}{student.lastName[0]}
                              </div>
                              <div>
                                <p className="text-white font-medium">{student.firstName} {student.lastName}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-gray-400">{student.course}</td>
                          <td className="p-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                              student.absences >= 10 ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {student.absences}
                            </span>
                          </td>
                          <td className="p-4 text-gray-400">{student.lastAbsence}</td>
                          <td className="p-4 text-center">
                            {student.absences >= 10 ? (
                              <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-medium">
                                Crítico
                              </span>
                            ) : student.absences >= 7 ? (
                              <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium">
                                En Riesgo
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                                Seguimiento
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsModule;
