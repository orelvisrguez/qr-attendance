// ============================================
// PROFESOR PAGE - Dashboard con Datos Reales
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { QRProjector } from '../components/qr/QRProjector';
import { useAuthStore } from '../store/auth-store';
import { API_URL } from '../lib/api';
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
  GraduationCap,
  TrendingUp,
  FileText,
  Loader2,
  RefreshCw,
  Pause,
  Square,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface Course {
  id: string;
  name: string;
  grade: string;
  section: string;
  year?: number;
  studentCount: number;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  courseId: string;
}

interface ActiveSession {
  id: string;
  courseId: string;
  subjectId: string;
  courseName: string;
  subjectName: string;
  secret: string;
  qrRotationSeconds: number;
  startedAt: string;
  status: 'ACTIVE' | 'PAUSED' | 'CLOSED';
}

interface SessionHistory {
  id: string;
  courseName: string;
  subjectName: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  presentCount?: number;
  lateCount?: number;
  absentCount?: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const getGradientColor = (index: number): string => {
  const colors = [
    'from-blue-500 to-blue-600',
    'from-purple-500 to-purple-600',
    'from-emerald-500 to-emerald-600',
    'from-orange-500 to-orange-600',
    'from-rose-500 to-rose-600',
    'from-cyan-500 to-cyan-600',
    'from-amber-500 to-amber-600',
    'from-indigo-500 to-indigo-600',
  ];
  return colors[index % colors.length];
};

const getSubjectIcon = (name: string): string => {
  const icons: Record<string, string> = {
    'matemáticas': '📐',
    'física': '⚡',
    'química': '🧪',
    'historia': '📜',
    'lengua': '📖',
    'inglés': '🇬🇧',
    'biología': '🧬',
    'geografía': '🌍',
    'arte': '🎨',
    'música': '🎵',
    'educación física': '⚽',
    'informática': '💻',
  };
  const key = name.toLowerCase();
  for (const [k, v] of Object.entries(icons)) {
    if (key.includes(k)) return v;
  }
  return '📚';
};

// ============================================
// COMPONENTS
// ============================================

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

const CourseCard: React.FC<{
  course: Course;
  colorIndex: number;
  onSelect: () => void;
  isSelected: boolean;
}> = ({ course, colorIndex, onSelect, isSelected }) => (
  <button
    onClick={onSelect}
    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
      isSelected
        ? 'border-indigo-500 bg-indigo-50 shadow-md'
        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
    }`}
  >
    <div className="flex items-center gap-3">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getGradientColor(colorIndex)} flex items-center justify-center text-white font-bold text-lg shadow-sm`}>
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
    <span className="text-2xl block mb-2">{getSubjectIcon(subject.name)}</span>
    <h4 className="font-medium text-gray-900 text-sm">{subject.name}</h4>
    <p className="text-xs text-gray-400">{subject.code}</p>
  </button>
);

const SessionHistoryItem: React.FC<{ session: SessionHistory }> = ({ session }) => {
  const startDate = new Date(session.startedAt);
  const statusColors = {
    ACTIVE: 'bg-green-100 text-green-700',
    PAUSED: 'bg-yellow-100 text-yellow-700',
    CLOSED: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
        <BookOpen size={20} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-gray-900">{session.subjectName}</h4>
          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[session.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-700'}`}>
            {session.status === 'ACTIVE' ? 'Activa' : session.status === 'PAUSED' ? 'Pausada' : 'Finalizada'}
          </span>
        </div>
        <p className="text-sm text-gray-500">
          {session.courseName} • {startDate.toLocaleDateString()} {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      {session.presentCount !== undefined && (
        <div className="flex gap-3 text-sm">
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle2 size={16} /> {session.presentCount}
          </span>
          {session.lateCount !== undefined && session.lateCount > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <AlertCircle size={16} /> {session.lateCount}
            </span>
          )}
        </div>
      )}
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

  // Data states
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessionHistory, setSessionHistory] = useState<SessionHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFromDatabase, setIsFromDatabase] = useState(false);

  // Session states
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Filtered subjects based on selected course
  const filteredSubjects = selectedCourse
    ? subjects.filter(s => s.courseId === selectedCourse)
    : subjects;

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchProfesorData = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch courses and subjects
      const coursesRes = await fetch(`${API_URL}/api/profesor/courses?profesorId=${user.id}`);
      const coursesData = await coursesRes.json();

      if (coursesData.success) {
        setCourses(coursesData.data.courses);
        setSubjects(coursesData.data.subjects);
        setIsFromDatabase(coursesData.data.isFromDatabase);
      }

      // Fetch session history
      const sessionsRes = await fetch(`${API_URL}/api/sessions?profesorId=${user.id}`);
      const sessionsData = await sessionsRes.json();

      if (sessionsData.success) {
        setSessionHistory(sessionsData.data);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Error cargando datos. Usando datos de demostración.');

      // Use mock data on error
      setCourses([
        { id: 'mock-1', name: '3ro A', grade: '3ro Secundaria', section: 'A', studentCount: 32 },
        { id: 'mock-2', name: '3ro B', grade: '3ro Secundaria', section: 'B', studentCount: 30 },
        { id: 'mock-3', name: '4to A', grade: '4to Secundaria', section: 'A', studentCount: 28 },
      ]);
      setSubjects([
        { id: 'subj-1', name: 'Matemáticas', code: 'MAT-301', courseId: 'mock-1' },
        { id: 'subj-2', name: 'Física', code: 'FIS-301', courseId: 'mock-1' },
        { id: 'subj-3', name: 'Química', code: 'QUI-301', courseId: 'mock-2' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchProfesorData();
  }, [fetchProfesorData]);

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  const handleStartSession = async () => {
    if (!selectedCourse || !selectedSubject || !user?.id) return;

    setIsCreatingSession(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourse,
          subjectId: selectedSubject,
          profesorId: user.id,
          qrRotationSeconds: 7,
          tokenValidSeconds: 10,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear la sesión');
      }

      const course = courses.find(c => c.id === selectedCourse);
      const subject = subjects.find(s => s.id === selectedSubject);

      setActiveSession({
        id: data.data.id,
        courseId: selectedCourse,
        subjectId: selectedSubject,
        courseName: course?.name || data.data.courseName || 'Curso',
        subjectName: subject?.name || data.data.subjectName || 'Materia',
        secret: data.data.secret,
        qrRotationSeconds: data.data.qrRotationSeconds || 7,
        startedAt: data.data.startedAt,
        status: 'ACTIVE',
      });
    } catch (err: any) {
      console.error('Error creating session:', err);
      setError(err.message || 'Error al crear la sesión');
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;

    try {
      await fetch(`${API_URL}/api/sessions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSession.id,
          status: 'CLOSED',
        }),
      });

      setActiveSession(null);
      setViewMode('dashboard');
      fetchProfesorData(); // Refresh data
    } catch (err) {
      console.error('Error ending session:', err);
    }
  };

  const handlePauseSession = async () => {
    if (!activeSession) return;

    const newStatus = activeSession.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED';

    try {
      await fetch(`${API_URL}/api/sessions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSession.id,
          status: newStatus,
        }),
      });

      setActiveSession(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (err) {
      console.error('Error pausing session:', err);
    }
  };

  // ============================================
  // STATS
  // ============================================

  const stats = {
    totalCourses: courses.length,
    totalStudents: courses.reduce((acc, c) => acc + (c.studentCount || 0), 0),
    todaySessions: sessionHistory.filter(s => {
      const today = new Date().toDateString();
      return new Date(s.startedAt).toDateString() === today;
    }).length,
    activeSessions: sessionHistory.filter(s => s.status === 'ACTIVE').length,
  };

  // ============================================
  // ACTIVE SESSION VIEW
  // ============================================

  if (activeSession) {
    return (
      <div className="relative">
        <QRProjector
          sessionId={activeSession.id}
          sessionSecret={activeSession.secret}
          courseName={activeSession.courseName}
          subjectName={activeSession.subjectName}
          profesorName={`${user?.firstName} ${user?.lastName}`}
          qrRotationSeconds={activeSession.qrRotationSeconds}
          isPaused={activeSession.status === 'PAUSED'}
        />

        {/* Control Buttons */}
        <div className="fixed bottom-6 right-6 flex gap-3">
          <button
            onClick={handlePauseSession}
            className={`px-5 py-3 ${activeSession.status === 'PAUSED' ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-500 hover:bg-yellow-600'} text-white rounded-xl shadow-lg flex items-center gap-2 font-medium transition-colors`}
          >
            {activeSession.status === 'PAUSED' ? (
              <>
                <Play size={20} />
                Reanudar
              </>
            ) : (
              <>
                <Pause size={20} />
                Pausar
              </>
            )}
          </button>
          <button
            onClick={handleEndSession}
            className="px-5 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-lg flex items-center gap-2 font-medium transition-colors"
          >
            <Square size={20} />
            Finalizar Sesión
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // LOADING STATE
  // ============================================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando datos...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================

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
                  {!isFromDatabase && <span className="ml-2 text-xs text-amber-600">(Demo)</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchProfesorData}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                title="Actualizar datos"
              >
                <RefreshCw size={20} />
              </button>
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

      {/* Error Alert */}
      {error && (
        <div className="max-w-7xl mx-auto px-6 mt-4">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle size={20} />
            {error}
          </div>
        </div>
      )}

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
                subtext="clases registradas"
                color="from-purple-500 to-purple-600"
              />
              <StatCard
                icon={<TrendingUp className="text-white" size={24} />}
                label="Sesiones Activas"
                value={stats.activeSessions}
                subtext="en este momento"
                color="from-amber-500 to-amber-600"
              />
            </div>

            {/* Quick Start */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Inicio Rápido</h2>
                <button
                  onClick={() => setViewMode('start-session')}
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1"
                >
                  Ver todos <ChevronRight size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {courses.slice(0, 8).map((course, idx) => (
                  <button
                    key={course.id}
                    onClick={() => {
                      setSelectedCourse(course.id);
                      setViewMode('start-session');
                    }}
                    className="p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left group"
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getGradientColor(idx)} flex items-center justify-center text-white font-bold mb-3 shadow-sm group-hover:scale-110 transition-transform`}>
                      {course.section}
                    </div>
                    <h4 className="font-medium text-gray-900">{course.name}</h4>
                    <p className="text-xs text-gray-500">{course.studentCount} estudiantes</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Sessions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Sesiones Recientes</h2>
                <button
                  onClick={() => setViewMode('history')}
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1"
                >
                  Ver historial <ChevronRight size={16} />
                </button>
              </div>

              {sessionHistory.length > 0 ? (
                <div className="space-y-4">
                  {sessionHistory.slice(0, 5).map((session) => (
                    <SessionHistoryItem key={session.id} session={session} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Calendar size={48} className="mx-auto mb-3 opacity-50" />
                  <p>No hay sesiones registradas</p>
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
                  {courses.map((course, idx) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      colorIndex={idx}
                      onSelect={() => {
                        setSelectedCourse(course.id);
                        setSelectedSubject(''); // Reset subject when course changes
                      }}
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
                {filteredSubjects.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {filteredSubjects.map((subject) => (
                      <SubjectButton
                        key={subject.id}
                        subject={subject}
                        onSelect={() => setSelectedSubject(subject.id)}
                        isSelected={selectedSubject === subject.id}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl">
                    <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
                    <p>{selectedCourse ? 'No hay materias asignadas a este curso' : 'Selecciona un curso primero'}</p>
                  </div>
                )}
              </div>

              {/* Start Button */}
              <button
                onClick={handleStartSession}
                disabled={!selectedCourse || !selectedSubject || isCreatingSession}
                className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-lg rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
              >
                {isCreatingSession ? (
                  <>
                    <Loader2 size={24} className="animate-spin" />
                    Creando sesión...
                  </>
                ) : (
                  <>
                    <Play size={24} />
                    Iniciar Proyección de QR
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* History View */}
        {viewMode === 'history' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Historial de Sesiones</h2>
              <button
                onClick={fetchProfesorData}
                className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700"
              >
                <RefreshCw size={16} />
                Actualizar
              </button>
            </div>

            {sessionHistory.length > 0 ? (
              <div className="space-y-4">
                {sessionHistory.map((session) => (
                  <SessionHistoryItem key={session.id} session={session} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <History size={48} className="mx-auto mb-3 opacity-50" />
                <p>No hay historial de sesiones</p>
              </div>
            )}
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
