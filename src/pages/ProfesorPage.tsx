// ============================================
// PROFESOR PAGE - Dashboard Profesional del Profesor
// ============================================

import React, { useState, useMemo } from 'react';
import { QRProjector } from '../components/qr/QRProjector';
import { useAuthStore } from '../store/auth-store';
import {
  Users,
  BookOpen,
  Calendar,
  Clock,
  QrCode,
  BarChart3,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  Play,
  History,
  LogOut,
  User,
  GraduationCap,
  TrendingUp,
  FileText,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface Course {
  id: string;
  name: string;
  grade: string;
  section: string;
  studentCount: number;
  color: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  icon: string;
}

interface AttendanceSession {
  id: string;
  courseId: string;
  subjectId: string;
  date: string;
  startTime: string;
  endTime: string | null;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  status: 'active' | 'completed';
}

interface Student {
  id: string;
  name: string;
  avatar?: string;
  status: 'present' | 'absent' | 'late' | 'pending';
  time?: string;
}

// ============================================
// MOCK DATA
// ============================================

const mockCourses: Course[] = [
  { id: '1', name: '3ro A', grade: '3ro Secundaria', section: 'A', studentCount: 32, color: 'from-blue-500 to-blue-600' },
  { id: '2', name: '3ro B', grade: '3ro Secundaria', section: 'B', studentCount: 30, color: 'from-purple-500 to-purple-600' },
  { id: '3', name: '4to A', grade: '4to Secundaria', section: 'A', studentCount: 28, color: 'from-emerald-500 to-emerald-600' },
  { id: '4', name: '4to B', grade: '4to Secundaria', section: 'B', studentCount: 31, color: 'from-orange-500 to-orange-600' },
  { id: '5', name: '5to A', grade: '5to Secundaria', section: 'A', studentCount: 25, color: 'from-rose-500 to-rose-600' },
];

const mockSubjects: Subject[] = [
  { id: '1', name: 'Matemáticas', code: 'MAT-301', icon: '📐' },
  { id: '2', name: 'Física', code: 'FIS-301', icon: '⚡' },
  { id: '3', name: 'Química', code: 'QUI-301', icon: '🧪' },
  { id: '4', name: 'Álgebra', code: 'ALG-401', icon: '🔢' },
];

const mockTodaySessions: AttendanceSession[] = [
  {
    id: 's1',
    courseId: '1',
    subjectId: '1',
    date: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '08:45',
    presentCount: 30,
    absentCount: 2,
    lateCount: 0,
    status: 'completed',
  },
  {
    id: 's2',
    courseId: '2',
    subjectId: '2',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '09:45',
    presentCount: 28,
    absentCount: 1,
    lateCount: 1,
    status: 'completed',
  },
];

const mockRecentStudents: Student[] = [
  { id: '1', name: 'Ana García López', status: 'present', time: '08:02' },
  { id: '2', name: 'Carlos Mendoza', status: 'present', time: '08:03' },
  { id: '3', name: 'Diana Flores', status: 'late', time: '08:12' },
  { id: '4', name: 'Eduardo Sánchez', status: 'present', time: '08:01' },
  { id: '5', name: 'Fernanda Ruiz', status: 'absent' },
];

// ============================================
// COMPONENTS
// ============================================

// Stat Card Component
const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  color: string;
}> = ({ icon, label, value, subtext, color }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-xl bg-gradient-to-br ${color}`}>
        {icon}
      </div>
    </div>
  </div>
);

// Course Card Component
const CourseCard: React.FC<{
  course: Course;
  onSelect: () => void;
  isSelected: boolean;
}> = ({ course, onSelect, isSelected }) => (
  <button
    onClick={onSelect}
    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
      isSelected
        ? 'border-indigo-500 bg-indigo-50 shadow-md'
        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
    }`}
  >
    <div className="flex items-center gap-3">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${course.color} flex items-center justify-center text-white font-bold text-lg shadow-sm`}>
        {course.section}
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-gray-900">{course.name}</h4>
        <p className="text-sm text-gray-500">{course.grade}</p>
      </div>
      <div className="text-right">
        <p className="text-lg font-bold text-gray-900">{course.studentCount}</p>
        <p className="text-xs text-gray-400">estudiantes</p>
      </div>
    </div>
  </button>
);

// Subject Button Component
const SubjectButton: React.FC<{
  subject: Subject;
  onSelect: () => void;
  isSelected: boolean;
}> = ({ subject, onSelect, isSelected }) => (
  <button
    onClick={onSelect}
    className={`p-4 rounded-xl border-2 transition-all text-center ${
      isSelected
        ? 'border-indigo-500 bg-indigo-50 shadow-md'
        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
    }`}
  >
    <span className="text-2xl block mb-2">{subject.icon}</span>
    <h4 className="font-medium text-gray-900 text-sm">{subject.name}</h4>
    <p className="text-xs text-gray-400">{subject.code}</p>
  </button>
);

// Session History Item
const SessionItem: React.FC<{ session: AttendanceSession; courses: Course[]; subjects: Subject[] }> = ({
  session,
  courses,
  subjects,
}) => {
  const course = courses.find((c) => c.id === session.courseId);
  const subject = subjects.find((s) => s.id === session.subjectId);
  const total = session.presentCount + session.absentCount + session.lateCount;
  const attendanceRate = Math.round((session.presentCount / total) * 100);

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${course?.color || 'from-gray-400 to-gray-500'} flex items-center justify-center text-white font-bold shadow-sm`}>
        {course?.section || '?'}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-gray-900">{subject?.name || 'Materia'}</h4>
          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Completada</span>
        </div>
        <p className="text-sm text-gray-500">
          {course?.name} • {session.startTime} - {session.endTime}
        </p>
      </div>
      <div className="text-right">
        <p className="text-lg font-bold text-gray-900">{attendanceRate}%</p>
        <p className="text-xs text-gray-400">asistencia</p>
      </div>
      <div className="flex gap-3 text-sm">
        <span className="flex items-center gap-1 text-green-600">
          <CheckCircle2 size={16} /> {session.presentCount}
        </span>
        <span className="flex items-center gap-1 text-amber-600">
          <AlertCircle size={16} /> {session.lateCount}
        </span>
        <span className="flex items-center gap-1 text-red-600">
          <XCircle size={16} /> {session.absentCount}
        </span>
      </div>
    </div>
  );
};

// Student List Item
const StudentItem: React.FC<{ student: Student }> = ({ student }) => {
  const statusConfig = {
    present: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100', label: 'Presente' },
    late: { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Tardanza' },
    absent: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Ausente' },
    pending: { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-100', label: 'Pendiente' },
  };

  const config = statusConfig[student.status];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
        {student.name.charAt(0)}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{student.name}</p>
        {student.time && <p className="text-xs text-gray-400">{student.time}</p>}
      </div>
      <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${config.bg} ${config.color}`}>
        <Icon size={12} />
        {config.label}
      </span>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

type ViewMode = 'dashboard' | 'start-session' | 'history' | 'reports';

export const ProfesorPage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [activeSession, setActiveSession] = useState<string | null>(null);

  // Stats calculations
  const stats = useMemo(() => {
    const totalStudents = mockCourses.reduce((acc, c) => acc + c.studentCount, 0);
    const todayPresent = mockTodaySessions.reduce((acc, s) => acc + s.presentCount, 0);
    const todayTotal = mockTodaySessions.reduce((acc, s) => acc + s.presentCount + s.absentCount + s.lateCount, 0);
    const todayRate = todayTotal > 0 ? Math.round((todayPresent / todayTotal) * 100) : 0;

    return {
      totalCourses: mockCourses.length,
      totalStudents,
      todaySessions: mockTodaySessions.length,
      todayRate,
    };
  }, []);

  // Handle starting a new session
  const handleStartSession = () => {
    if (!selectedCourse || !selectedSubject) return;
    setActiveSession(`session-${Date.now()}`);
  };

  // If there's an active session, show the QR Projector
  if (activeSession) {
    const course = mockCourses.find((c) => c.id === selectedCourse);
    const subject = mockSubjects.find((s) => s.id === selectedSubject);

    return (
      <div className="relative">
        <QRProjector
          sessionId={activeSession}
          courseName={course?.name || 'Curso'}
          subjectName={subject?.name || 'Materia'}
          profesorName={`${user?.firstName} ${user?.lastName}`}
        />
        <button
          onClick={() => {
            setActiveSession(null);
            setViewMode('dashboard');
          }}
          className="fixed bottom-6 right-6 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-lg flex items-center gap-2 font-medium transition-colors"
        >
          <XCircle size={20} />
          Finalizar Sesión
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                <GraduationCap size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Panel del Profesor</h1>
                <p className="text-sm text-gray-500">
                  Bienvenido, {user?.firstName} {user?.lastName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode('start-session')}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <QrCode size={18} />
                Nueva Sesión
              </button>
              <button
                onClick={logout}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                title="Cerrar Sesión"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'start-session', label: 'Iniciar Sesión', icon: QrCode },
              { id: 'history', label: 'Historial', icon: History },
              { id: 'reports', label: 'Reportes', icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setViewMode(tab.id as ViewMode)}
                  className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                    viewMode === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Dashboard View */}
        {viewMode === 'dashboard' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                icon={<BookOpen className="text-white" size={24} />}
                label="Mis Cursos"
                value={stats.totalCourses}
                subtext="cursos asignados"
                color="from-blue-500 to-blue-600"
              />
              <StatCard
                icon={<Users className="text-white" size={24} />}
                label="Total Estudiantes"
                value={stats.totalStudents}
                subtext="en todos los cursos"
                color="from-emerald-500 to-emerald-600"
              />
              <StatCard
                icon={<Calendar className="text-white" size={24} />}
                label="Sesiones Hoy"
                value={stats.todaySessions}
                subtext="clases completadas"
                color="from-purple-500 to-purple-600"
              />
              <StatCard
                icon={<TrendingUp className="text-white" size={24} />}
                label="Asistencia Hoy"
                value={`${stats.todayRate}%`}
                subtext="promedio del día"
                color="from-amber-500 to-amber-600"
              />
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Quick Start */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Inicio Rápido</h2>
                  <button
                    onClick={() => setViewMode('start-session')}
                    className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1"
                  >
                    Ver todos <ChevronRight size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {mockCourses.slice(0, 6).map((course) => (
                    <button
                      key={course.id}
                      onClick={() => {
                        setSelectedCourse(course.id);
                        setViewMode('start-session');
                      }}
                      className="p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left group"
                    >
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${course.color} flex items-center justify-center text-white font-bold mb-3 shadow-sm group-hover:scale-110 transition-transform`}>
                        {course.section}
                      </div>
                      <h4 className="font-medium text-gray-900">{course.name}</h4>
                      <p className="text-xs text-gray-500">{course.studentCount} estudiantes</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Última Sesión</h2>

                {mockRecentStudents.length > 0 ? (
                  <div className="space-y-1 divide-y divide-gray-100">
                    {mockRecentStudents.map((student) => (
                      <StudentItem key={student.id} student={student} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Clock size={48} className="mx-auto mb-3 opacity-50" />
                    <p>Sin actividad reciente</p>
                  </div>
                )}
              </div>
            </div>

            {/* Today's Sessions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Sesiones de Hoy</h2>
                <span className="text-sm text-gray-500">
                  {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </div>

              {mockTodaySessions.length > 0 ? (
                <div className="space-y-4">
                  {mockTodaySessions.map((session) => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      courses={mockCourses}
                      subjects={mockSubjects}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Calendar size={48} className="mx-auto mb-3 opacity-50" />
                  <p>No hay sesiones registradas hoy</p>
                  <button
                    onClick={() => setViewMode('start-session')}
                    className="mt-4 px-4 py-2 bg-indigo-100 text-indigo-600 rounded-lg font-medium hover:bg-indigo-200 transition-colors"
                  >
                    Iniciar primera sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Start Session View */}
        {viewMode === 'start-session' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white mx-auto mb-4 shadow-lg">
                  <QrCode size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Iniciar Sesión de Asistencia</h2>
                <p className="text-gray-500 mt-2">Selecciona el curso y la materia para comenzar</p>
              </div>

              {/* Step 1: Select Course */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">1</span>
                  Selecciona el Curso
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {mockCourses.map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      onSelect={() => setSelectedCourse(course.id)}
                      isSelected={selectedCourse === course.id}
                    />
                  ))}
                </div>
              </div>

              {/* Step 2: Select Subject */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">2</span>
                  Selecciona la Materia
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {mockSubjects.map((subject) => (
                    <SubjectButton
                      key={subject.id}
                      subject={subject}
                      onSelect={() => setSelectedSubject(subject.id)}
                      isSelected={selectedSubject === subject.id}
                    />
                  ))}
                </div>
              </div>

              {/* Start Button */}
              <button
                onClick={handleStartSession}
                disabled={!selectedCourse || !selectedSubject}
                className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-lg rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
              >
                <Play size={24} />
                Iniciar Proyección de QR
              </button>
            </div>
          </div>
        )}

        {/* History View */}
        {viewMode === 'history' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Historial de Sesiones</h2>

            <div className="space-y-4">
              {mockTodaySessions.map((session) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  courses={mockCourses}
                  subjects={mockSubjects}
                />
              ))}

              {mockTodaySessions.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <History size={48} className="mx-auto mb-3 opacity-50" />
                  <p>No hay historial de sesiones</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reports View */}
        {viewMode === 'reports' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Reportes</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: 'Reporte Semanal', desc: 'Asistencia de la última semana', icon: Calendar },
                { title: 'Reporte por Curso', desc: 'Estadísticas por cada curso', icon: BookOpen },
                { title: 'Estudiantes Ausentes', desc: 'Lista de ausencias frecuentes', icon: Users },
              ].map((report, idx) => {
                const Icon = report.icon;
                return (
                  <button
                    key={idx}
                    className="p-6 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
                      <Icon size={24} />
                    </div>
                    <h4 className="font-semibold text-gray-900">{report.title}</h4>
                    <p className="text-sm text-gray-500 mt-1">{report.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ProfesorPage;
