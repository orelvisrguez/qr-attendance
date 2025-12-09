// ============================================
// ALUMNO PAGE - Dashboard Profesional del Estudiante
// Diseño mobile-first, PWA-ready
// ============================================

import React, { useState, useMemo } from 'react';
import { QRScanner } from '../components/qr/QRScanner';
import { useAuthStore } from '../store/auth-store';
import {
  QrCode,
  History,
  User,
  Calendar,
  BookOpen,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  ChevronRight,
  LogOut,
  Bell,
  Settings,
  Award,
  Target,
  Flame,
  Star,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

type ViewMode = 'home' | 'scanner' | 'history' | 'profile' | 'success';

interface AttendanceRecord {
  id: string;
  date: string;
  subject: string;
  subjectIcon: string;
  course: string;
  professor: string;
  status: 'PRESENTE' | 'TARDANZA' | 'AUSENTE';
  time: string;
}

interface CourseInfo {
  id: string;
  name: string;
  grade: string;
  subjects: number;
  color: string;
}

interface UpcomingClass {
  id: string;
  subject: string;
  time: string;
  professor: string;
  room: string;
}

// ============================================
// MOCK DATA
// ============================================

const mockStats = {
  totalClasses: 45,
  present: 41,
  late: 3,
  absent: 1,
  streak: 12,
  rate: 91,
};

const mockHistory: AttendanceRecord[] = [
  { id: '1', date: 'Hoy', subject: 'Matemáticas', subjectIcon: '📐', course: '3ro A', professor: 'Prof. María González', status: 'PRESENTE', time: '08:02' },
  { id: '2', date: 'Hoy', subject: 'Física', subjectIcon: '⚡', course: '3ro A', professor: 'Prof. Carlos Ruiz', status: 'PRESENTE', time: '09:05' },
  { id: '3', date: 'Ayer', subject: 'Química', subjectIcon: '🧪', course: '3ro A', professor: 'Prof. Ana López', status: 'TARDANZA', time: '10:15' },
  { id: '4', date: 'Ayer', subject: 'Historia', subjectIcon: '📜', course: '3ro A', professor: 'Prof. Pedro Sánchez', status: 'PRESENTE', time: '11:01' },
  { id: '5', date: 'Lunes', subject: 'Inglés', subjectIcon: '🌐', course: '3ro A', professor: 'Prof. Laura Díaz', status: 'PRESENTE', time: '08:03' },
  { id: '6', date: 'Lunes', subject: 'Matemáticas', subjectIcon: '📐', course: '3ro A', professor: 'Prof. María González', status: 'PRESENTE', time: '09:00' },
  { id: '7', date: 'Viernes', subject: 'Educación Física', subjectIcon: '⚽', course: '3ro A', professor: 'Prof. Miguel Torres', status: 'AUSENTE', time: '-' },
];

const mockCourse: CourseInfo = {
  id: '1',
  name: '3ro A',
  grade: '3er Año de Secundaria',
  subjects: 8,
  color: 'from-indigo-500 to-purple-600',
};

const mockUpcoming: UpcomingClass[] = [
  { id: '1', subject: 'Química', time: '10:00 - 10:45', professor: 'Prof. Ana López', room: 'Lab 2' },
  { id: '2', subject: 'Historia', time: '11:00 - 11:45', professor: 'Prof. Pedro Sánchez', room: 'Aula 12' },
  { id: '3', subject: 'Inglés', time: '12:00 - 12:45', professor: 'Prof. Laura Díaz', room: 'Aula 8' },
];

// ============================================
// COMPONENTS
// ============================================

// Stat Card Mini
const StatMini: React.FC<{
  icon: React.ReactNode;
  value: number | string;
  label: string;
  color: string;
}> = ({ icon, value, label, color }) => (
  <div className={`flex flex-col items-center p-3 rounded-xl ${color}`}>
    <div className="mb-1">{icon}</div>
    <p className="text-xl font-bold text-white">{value}</p>
    <p className="text-xs text-white/70">{label}</p>
  </div>
);

// Attendance Record Item
const AttendanceItem: React.FC<{ record: AttendanceRecord }> = ({ record }) => {
  const statusConfig = {
    PRESENTE: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/20' },
    TARDANZA: { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/20' },
    AUSENTE: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20' },
  };
  const config = statusConfig[record.status];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center text-lg">
        {record.subjectIcon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium truncate">{record.subject}</p>
        <p className="text-gray-400 text-xs truncate">{record.professor}</p>
      </div>
      <div className="text-right">
        <p className="text-gray-300 text-sm">{record.time}</p>
        <span className={`inline-flex items-center gap-1 text-xs ${config.color}`}>
          <Icon size={12} />
          {record.status}
        </span>
      </div>
    </div>
  );
};

// Upcoming Class Card
const UpcomingCard: React.FC<{ classInfo: UpcomingClass; isNext?: boolean }> = ({ classInfo, isNext }) => (
  <div className={`p-4 rounded-xl border ${isNext ? 'bg-indigo-500/20 border-indigo-500/50' : 'bg-white/5 border-white/10'}`}>
    <div className="flex items-center justify-between mb-2">
      <span className={`text-sm font-medium ${isNext ? 'text-indigo-300' : 'text-gray-400'}`}>
        {classInfo.time}
      </span>
      {isNext && (
        <span className="text-xs px-2 py-0.5 bg-indigo-500 text-white rounded-full">Siguiente</span>
      )}
    </div>
    <h4 className="text-white font-semibold">{classInfo.subject}</h4>
    <p className="text-gray-400 text-sm">{classInfo.professor} • {classInfo.room}</p>
  </div>
);

// Progress Ring
const ProgressRing: React.FC<{ percentage: number; size?: number }> = ({ percentage, size = 120 }) => {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-white/10"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="text-green-400 transition-all duration-500"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white">{percentage}%</span>
        <span className="text-xs text-gray-400">Asistencia</span>
      </div>
    </div>
  );
};

// Achievement Badge
const AchievementBadge: React.FC<{ icon: React.ReactNode; title: string; desc: string; unlocked: boolean }> = ({
  icon, title, desc, unlocked
}) => (
  <div className={`flex items-center gap-3 p-3 rounded-xl ${unlocked ? 'bg-amber-500/20' : 'bg-white/5 opacity-50'}`}>
    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${unlocked ? 'bg-amber-500 text-white' : 'bg-gray-700 text-gray-500'}`}>
      {icon}
    </div>
    <div>
      <p className={`font-medium ${unlocked ? 'text-amber-300' : 'text-gray-500'}`}>{title}</p>
      <p className="text-xs text-gray-400">{desc}</p>
    </div>
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

export const AlumnoPage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'PRESENTE' | 'TARDANZA' | 'AUSENTE'>('all');

  // Filtered history
  const filteredHistory = useMemo(() => {
    if (historyFilter === 'all') return mockHistory;
    return mockHistory.filter(r => r.status === historyFilter);
  }, [historyFilter]);

  // Grouped history by date
  const groupedHistory = useMemo(() => {
    const groups: Record<string, AttendanceRecord[]> = {};
    filteredHistory.forEach(record => {
      if (!groups[record.date]) groups[record.date] = [];
      groups[record.date].push(record);
    });
    return groups;
  }, [filteredHistory]);

  const handleScanSuccess = () => {
    setViewMode('success');
    setTimeout(() => setViewMode('home'), 3000);
  };

  const handleScanError = (error: string) => {
    console.error('Error en escaneo:', error);
  };

  // Success View
  if (viewMode === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-emerald-600 flex flex-col items-center justify-center p-8">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 animate-bounce shadow-2xl">
          <CheckCircle2 size={48} className="text-green-500" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">¡Asistencia Registrada!</h1>
        <p className="text-white/90 text-xl text-center">
          {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </p>
        <div className="mt-8 flex items-center gap-2 text-white/80">
          <Flame size={20} />
          <span>{mockStats.streak + 1} días consecutivos</span>
        </div>
      </div>
    );
  }

  // Scanner View
  if (viewMode === 'scanner') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
        <QRScanner
          userId={user?.id || 'mock-user'}
          studentName={`${user?.firstName || 'Alumno'} ${user?.lastName || ''}`}
          onSuccess={handleScanSuccess}
          onError={handleScanError}
        />

        {/* Back button */}
        <button
          onClick={() => setViewMode('home')}
          className="fixed top-4 left-4 p-2 bg-white/10 backdrop-blur rounded-xl text-white z-50"
        >
          <ChevronRight size={24} className="rotate-180" />
        </button>
      </div>
    );
  }

  // History View
  if (viewMode === 'history') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 pb-24">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-white/10 px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setViewMode('home')} className="p-2 text-white hover:bg-white/10 rounded-lg">
              <ChevronRight size={24} className="rotate-180" />
            </button>
            <h1 className="text-xl font-bold text-white flex-1">Historial de Asistencia</h1>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
            {[
              { key: 'all', label: 'Todos' },
              { key: 'PRESENTE', label: 'Presentes' },
              { key: 'TARDANZA', label: 'Tardanzas' },
              { key: 'AUSENTE', label: 'Ausencias' },
            ].map(filter => (
              <button
                key={filter.key}
                onClick={() => setHistoryFilter(filter.key as typeof historyFilter)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  historyFilter === filter.key
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </header>

        {/* Stats Summary */}
        <div className="px-4 py-4">
          <div className="grid grid-cols-4 gap-2">
            <StatMini icon={<BookOpen size={18} className="text-white" />} value={mockStats.totalClasses} label="Total" color="bg-white/10" />
            <StatMini icon={<CheckCircle2 size={18} className="text-green-300" />} value={mockStats.present} label="Presente" color="bg-green-500/20" />
            <StatMini icon={<AlertCircle size={18} className="text-amber-300" />} value={mockStats.late} label="Tardanza" color="bg-amber-500/20" />
            <StatMini icon={<XCircle size={18} className="text-red-300" />} value={mockStats.absent} label="Ausencia" color="bg-red-500/20" />
          </div>
        </div>

        {/* Grouped History */}
        <div className="px-4 space-y-6">
          {Object.entries(groupedHistory).map(([date, records]) => (
            <div key={date}>
              <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">{date}</h3>
              <div className="space-y-2">
                {records.map(record => (
                  <AttendanceItem key={record.id} record={record} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Navigation */}
        <BottomNav viewMode={viewMode} setViewMode={setViewMode} />
      </div>
    );
  }

  // Profile View
  if (viewMode === 'profile') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 pb-24">
        {/* Header */}
        <header className="relative pt-8 pb-6 px-4">
          <button onClick={() => setViewMode('home')} className="absolute top-4 left-4 p-2 text-white hover:bg-white/10 rounded-lg">
            <ChevronRight size={24} className="rotate-180" />
          </button>
          <button onClick={logout} className="absolute top-4 right-4 p-2 text-red-400 hover:bg-red-500/20 rounded-lg">
            <LogOut size={20} />
          </button>

          <div className="text-center mt-4">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-lg">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <h1 className="text-2xl font-bold text-white">{user?.firstName} {user?.lastName}</h1>
            <p className="text-gray-400">{user?.email}</p>
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 rounded-full">
              <BookOpen size={14} className="text-indigo-400" />
              <span className="text-indigo-300 text-sm">{mockCourse.name} • {mockCourse.grade}</span>
            </div>
          </div>
        </header>

        {/* Stats */}
        <div className="px-4 py-6">
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-center mb-6">
              <ProgressRing percentage={mockStats.rate} />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-400">{mockStats.present}</p>
                <p className="text-xs text-gray-400">Presentes</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-400">{mockStats.late}</p>
                <p className="text-xs text-gray-400">Tardanzas</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{mockStats.absent}</p>
                <p className="text-xs text-gray-400">Ausencias</p>
              </div>
            </div>
          </div>
        </div>

        {/* Achievements */}
        <div className="px-4">
          <h2 className="text-lg font-semibold text-white mb-4">Logros</h2>
          <div className="space-y-3">
            <AchievementBadge icon={<Flame size={20} />} title="Racha de 7 días" desc="Asiste 7 días seguidos" unlocked={true} />
            <AchievementBadge icon={<Target size={20} />} title="Puntualidad Perfecta" desc="Sin tardanzas en el mes" unlocked={false} />
            <AchievementBadge icon={<Star size={20} />} title="100% Asistencia" desc="Asistencia perfecta mensual" unlocked={false} />
            <AchievementBadge icon={<Award size={20} />} title="Estudiante Ejemplar" desc="90%+ asistencia trimestral" unlocked={true} />
          </div>
        </div>

        {/* Bottom Navigation */}
        <BottomNav viewMode={viewMode} setViewMode={setViewMode} />
      </div>
    );
  }

  // Home View (Default)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 pb-24">
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Bienvenido,</p>
            <h1 className="text-2xl font-bold text-white">{user?.firstName} {user?.lastName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl relative">
              <Bell size={22} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button
              onClick={() => setViewMode('profile')}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-medium"
            >
              {user?.firstName?.[0]}
            </button>
          </div>
        </div>
      </header>

      {/* Quick Scan Card */}
      <div className="px-4 mb-6">
        <button
          onClick={() => setViewMode('scanner')}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 flex items-center gap-4 shadow-lg hover:shadow-xl transition-shadow active:scale-[0.98]"
        >
          <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
            <QrCode size={32} className="text-white" />
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-xl font-bold text-white">Escanear QR</h3>
            <p className="text-white/70 text-sm">Toca para registrar tu asistencia</p>
          </div>
          <ChevronRight size={24} className="text-white/70" />
        </button>
      </div>

      {/* Stats Overview */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Mi Asistencia</h2>
          <button
            onClick={() => setViewMode('history')}
            className="text-indigo-400 text-sm font-medium flex items-center gap-1"
          >
            Ver todo <ChevronRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Rate Card */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 col-span-1 row-span-2 flex flex-col items-center justify-center">
            <ProgressRing percentage={mockStats.rate} size={100} />
            <p className="text-gray-400 text-sm mt-2">Este mes</p>
          </div>

          {/* Streak Card */}
          <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-2xl p-4 border border-orange-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Flame size={20} className="text-orange-400" />
              <span className="text-orange-300 text-sm font-medium">Racha</span>
            </div>
            <p className="text-3xl font-bold text-white">{mockStats.streak}</p>
            <p className="text-gray-400 text-xs">días consecutivos</p>
          </div>

          {/* Today Card */}
          <div className="bg-green-500/20 rounded-2xl p-4 border border-green-500/30">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={20} className="text-green-400" />
              <span className="text-green-300 text-sm font-medium">Hoy</span>
            </div>
            <p className="text-3xl font-bold text-white">2</p>
            <p className="text-gray-400 text-xs">clases registradas</p>
          </div>
        </div>
      </div>

      {/* Upcoming Classes */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Próximas Clases</h2>
          <span className="text-gray-400 text-sm">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long' })}
          </span>
        </div>

        <div className="space-y-3">
          {mockUpcoming.map((cls, idx) => (
            <UpcomingCard key={cls.id} classInfo={cls} isNext={idx === 0} />
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="px-4">
        <h2 className="text-lg font-semibold text-white mb-4">Actividad Reciente</h2>
        <div className="space-y-2">
          {mockHistory.slice(0, 3).map(record => (
            <AttendanceItem key={record.id} record={record} />
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav viewMode={viewMode} setViewMode={setViewMode} />
    </div>
  );
};

// Bottom Navigation Component
const BottomNav: React.FC<{
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}> = ({ viewMode, setViewMode }) => (
  <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-white/10 px-4 py-2 z-50" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
    <div className="flex justify-around max-w-md mx-auto">
      {[
        { mode: 'home' as ViewMode, icon: BookOpen, label: 'Inicio' },
        { mode: 'scanner' as ViewMode, icon: QrCode, label: 'Escanear' },
        { mode: 'history' as ViewMode, icon: History, label: 'Historial' },
        { mode: 'profile' as ViewMode, icon: User, label: 'Perfil' },
      ].map(item => {
        const Icon = item.icon;
        const isActive = viewMode === item.mode || (viewMode === 'success' && item.mode === 'home');
        return (
          <button
            key={item.mode}
            onClick={() => setViewMode(item.mode)}
            className={`flex flex-col items-center py-2 px-4 rounded-xl transition-colors ${
              isActive ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Icon size={22} />
            <span className="text-xs mt-1">{item.label}</span>
          </button>
        );
      })}
    </div>
  </nav>
);

export default AlumnoPage;
