// ============================================
// SETTINGS MODULE COMPONENT
// Módulo completo de configuración del sistema
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../lib/api';

// ============================================
// TYPES
// ============================================

interface SchoolSettings {
  schoolName: string;
  schoolLogo: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  currentYear: number;
  timezone: string;
}

interface AttendanceSettings {
  qrRotationInterval: number;
  validationWindow: number;
  allowLateCheckIn: boolean;
  lateThresholdMinutes: number;
  autoCloseSessionMinutes: number;
  requireLocation: boolean;
  maxLocationRadius: number;
}

interface SecuritySettings {
  enableDeviceFingerprint: boolean;
  enableIpRestriction: boolean;
  allowedIpRanges: string[];
  maxDevicesPerStudent: number;
  enableAntiReplay: boolean;
  tokenExpirationSeconds: number;
  requirePasswordChange: number;
  minPasswordLength: number;
  requireStrongPassword: boolean;
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
}

interface NotificationSettings {
  enableEmailNotifications: boolean;
  enablePushNotifications: boolean;
  notifyAbsenceToParents: boolean;
  notifyAfterAbsences: number;
  dailyReportEmail: boolean;
  dailyReportTime: string;
  weeklyReportEmail: boolean;
  weeklyReportDay: string;
  notifyLowAttendance: boolean;
  lowAttendanceThreshold: number;
}

interface AppearanceSettings {
  primaryColor: string;
  darkMode: boolean;
  compactMode: boolean;
  showAnimations: boolean;
  language: string;
  dateFormat: string;
  timeFormat: string;
}

interface BackupSettings {
  autoBackup: boolean;
  backupFrequency: string;
  backupTime: string;
  retentionDays: number;
  lastBackup: string;
  backupLocation: string;
}

type SettingsSection = 'school' | 'attendance' | 'security' | 'notifications' | 'appearance' | 'backup' | 'system';

// ============================================
// SUB-COMPONENTS
// ============================================

const Toggle: React.FC<{
  enabled: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}> = ({ enabled, onChange, disabled }) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(!enabled)}
    disabled={disabled}
    className={`relative w-11 h-6 rounded-full transition-colors ${
      enabled ? 'bg-purple-500' : 'bg-gray-600'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <span
      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
        enabled ? 'left-6' : 'left-1'
      }`}
    />
  </button>
);

const SettingRow: React.FC<{
  label: string;
  description?: string;
  children: React.ReactNode;
}> = ({ label, description, children }) => (
  <div className="flex items-center justify-between py-4 border-b border-slate-700/50 last:border-b-0">
    <div className="flex-1 pr-4">
      <p className="text-white font-medium">{label}</p>
      {description && <p className="text-gray-500 text-sm mt-1">{description}</p>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

const NumberInput: React.FC<{
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}> = ({ value, onChange, min = 0, max = 999, step = 1, unit }) => (
  <div className="flex items-center gap-2">
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min}
      max={max}
      step={step}
      className="w-20 px-3 py-1.5 bg-slate-700 border border-slate-600 text-white rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
    />
    {unit && <span className="text-gray-400 text-sm">{unit}</span>}
  </div>
);

const SelectInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}> = ({ value, onChange, options }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="px-3 py-1.5 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
  >
    {options.map((opt) => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
);

// ============================================
// MAIN COMPONENT
// ============================================

export const SettingsModule: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('school');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Settings states
  const [school, setSchool] = useState<SchoolSettings | null>(null);
  const [attendance, setAttendance] = useState<AttendanceSettings | null>(null);
  const [security, setSecurity] = useState<SecuritySettings | null>(null);
  const [notifications, setNotifications] = useState<NotificationSettings | null>(null);
  const [appearance, setAppearance] = useState<AppearanceSettings | null>(null);
  const [backup, setBackup] = useState<BackupSettings | null>(null);
  const [systemInfo, setSystemInfo] = useState<any>(null);

  // Fetch all settings
  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/settings`);
      const data = await res.json();
      if (data.success) {
        setSchool(data.data.school);
        setAttendance(data.data.attendance);
        setSecurity(data.data.security);
        setNotifications(data.data.notifications);
        setAppearance(data.data.appearance);
        setBackup(data.data.backup);
      }

      // Fetch system info
      const sysRes = await fetch(`${API_URL}/api/settings/system/info`);
      const sysData = await sysRes.json();
      if (sysData.success) {
        setSystemInfo(sysData.data);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al cargar configuración' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Save settings
  const saveSettings = async (section: string, data: any) => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_URL}/api/settings/${section}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        setMessage({ type: 'success', text: result.message || 'Guardado exitosamente' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: result.error || 'Error al guardar' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setIsSaving(false);
    }
  };

  // Run backup
  const runBackup = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/settings/backup/run`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        if (backup) {
          setBackup({ ...backup, lastBackup: data.lastBackup });
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al realizar respaldo' });
    } finally {
      setIsSaving(false);
    }
  };

  // Sections menu
  const sections = [
    { id: 'school', label: 'Institución', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { id: 'attendance', label: 'Asistencia', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'security', label: 'Seguridad', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
    { id: 'notifications', label: 'Notificaciones', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    { id: 'appearance', label: 'Apariencia', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
    { id: 'backup', label: 'Respaldo', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4' },
    { id: 'system', label: 'Sistema', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  ];

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${mins}m`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <div className="w-64 shrink-0">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-2 sticky top-8">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as SettingsSection)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeSection === section.id
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={section.icon} />
              </svg>
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-6">
        {/* Message */}
        {message && (
          <div className={`px-4 py-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-500/20 border border-green-500 text-green-200'
              : 'bg-red-500/20 border border-red-500 text-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* SCHOOL SETTINGS */}
        {activeSection === 'school' && school && (
          <div className="bg-slate-800 rounded-xl border border-slate-700">
            <div className="p-4 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">Configuración de Institución</h2>
              <p className="text-gray-400 text-sm">Información general del colegio</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Nombre del Colegio</label>
                  <input
                    type="text"
                    value={school.schoolName}
                    onChange={(e) => setSchool({ ...school, schoolName: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Año Lectivo</label>
                  <input
                    type="number"
                    value={school.currentYear}
                    onChange={(e) => setSchool({ ...school, currentYear: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Teléfono</label>
                  <input
                    type="tel"
                    value={school.phone}
                    onChange={(e) => setSchool({ ...school, phone: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Email</label>
                  <input
                    type="email"
                    value={school.email}
                    onChange={(e) => setSchool({ ...school, email: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-gray-400 text-sm mb-2">Dirección</label>
                  <input
                    type="text"
                    value={school.address}
                    onChange={(e) => setSchool({ ...school, address: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Sitio Web</label>
                  <input
                    type="url"
                    value={school.website}
                    onChange={(e) => setSchool({ ...school, website: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Zona Horaria</label>
                  <select
                    value={school.timezone}
                    onChange={(e) => setSchool({ ...school, timezone: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="America/Lima">America/Lima (UTC-5)</option>
                    <option value="America/Bogota">America/Bogota (UTC-5)</option>
                    <option value="America/Mexico_City">America/Mexico_City (UTC-6)</option>
                    <option value="America/Buenos_Aires">America/Buenos_Aires (UTC-3)</option>
                    <option value="Europe/Madrid">Europe/Madrid (UTC+1)</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => saveSettings('school', school)}
                  disabled={isSaving}
                  className="px-6 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-lg flex items-center gap-2"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ATTENDANCE SETTINGS */}
        {activeSection === 'attendance' && attendance && (
          <div className="bg-slate-800 rounded-xl border border-slate-700">
            <div className="p-4 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">Configuración de Asistencia</h2>
              <p className="text-gray-400 text-sm">Parámetros del sistema de asistencia QR</p>
            </div>
            <div className="p-6">
              <SettingRow
                label="Intervalo de rotación QR"
                description="Cada cuántos segundos se genera un nuevo código QR"
              >
                <NumberInput
                  value={attendance.qrRotationInterval}
                  onChange={(v) => setAttendance({ ...attendance, qrRotationInterval: v })}
                  min={3}
                  max={30}
                  unit="seg"
                />
              </SettingRow>

              <SettingRow
                label="Ventana de validación"
                description="Tiempo máximo para validar un código después de generado"
              >
                <NumberInput
                  value={attendance.validationWindow}
                  onChange={(v) => setAttendance({ ...attendance, validationWindow: v })}
                  min={5}
                  max={60}
                  unit="seg"
                />
              </SettingRow>

              <SettingRow
                label="Permitir llegadas tarde"
                description="Registrar asistencia después de la hora de inicio"
              >
                <Toggle
                  enabled={attendance.allowLateCheckIn}
                  onChange={(v) => setAttendance({ ...attendance, allowLateCheckIn: v })}
                />
              </SettingRow>

              {attendance.allowLateCheckIn && (
                <SettingRow
                  label="Umbral de tardanza"
                  description="Minutos después de la hora para marcar como tardanza"
                >
                  <NumberInput
                    value={attendance.lateThresholdMinutes}
                    onChange={(v) => setAttendance({ ...attendance, lateThresholdMinutes: v })}
                    min={5}
                    max={60}
                    unit="min"
                  />
                </SettingRow>
              )}

              <SettingRow
                label="Cierre automático de sesión"
                description="Tiempo después del cual se cierra la sesión de asistencia"
              >
                <NumberInput
                  value={attendance.autoCloseSessionMinutes}
                  onChange={(v) => setAttendance({ ...attendance, autoCloseSessionMinutes: v })}
                  min={30}
                  max={300}
                  unit="min"
                />
              </SettingRow>

              <SettingRow
                label="Requerir ubicación"
                description="Verificar que el estudiante esté dentro del campus"
              >
                <Toggle
                  enabled={attendance.requireLocation}
                  onChange={(v) => setAttendance({ ...attendance, requireLocation: v })}
                />
              </SettingRow>

              {attendance.requireLocation && (
                <SettingRow
                  label="Radio máximo de ubicación"
                  description="Distancia máxima permitida desde el centro del campus"
                >
                  <NumberInput
                    value={attendance.maxLocationRadius}
                    onChange={(v) => setAttendance({ ...attendance, maxLocationRadius: v })}
                    min={50}
                    max={2000}
                    step={50}
                    unit="m"
                  />
                </SettingRow>
              )}

              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => saveSettings('attendance', attendance)}
                  disabled={isSaving}
                  className="px-6 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-lg flex items-center gap-2"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECURITY SETTINGS */}
        {activeSection === 'security' && security && (
          <div className="bg-slate-800 rounded-xl border border-slate-700">
            <div className="p-4 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">Configuración de Seguridad</h2>
              <p className="text-gray-400 text-sm">Parámetros de seguridad y anti-fraude</p>
            </div>
            <div className="p-6">
              <h3 className="text-white font-medium mb-4">Anti-Fraude</h3>

              <SettingRow
                label="Huella digital de dispositivo"
                description="Registrar y verificar el dispositivo del estudiante"
              >
                <Toggle
                  enabled={security.enableDeviceFingerprint}
                  onChange={(v) => setSecurity({ ...security, enableDeviceFingerprint: v })}
                />
              </SettingRow>

              <SettingRow
                label="Máximo dispositivos por estudiante"
                description="Cantidad de dispositivos que puede registrar un estudiante"
              >
                <NumberInput
                  value={security.maxDevicesPerStudent}
                  onChange={(v) => setSecurity({ ...security, maxDevicesPerStudent: v })}
                  min={1}
                  max={5}
                />
              </SettingRow>

              <SettingRow
                label="Protección anti-replay"
                description="Prevenir reutilización de códigos QR escaneados"
              >
                <Toggle
                  enabled={security.enableAntiReplay}
                  onChange={(v) => setSecurity({ ...security, enableAntiReplay: v })}
                />
              </SettingRow>

              <SettingRow
                label="Expiración de tokens"
                description="Tiempo de vida de los tokens QR"
              >
                <NumberInput
                  value={security.tokenExpirationSeconds}
                  onChange={(v) => setSecurity({ ...security, tokenExpirationSeconds: v })}
                  min={5}
                  max={30}
                  unit="seg"
                />
              </SettingRow>

              <SettingRow
                label="Restricción por IP"
                description="Solo permitir acceso desde IPs autorizadas"
              >
                <Toggle
                  enabled={security.enableIpRestriction}
                  onChange={(v) => setSecurity({ ...security, enableIpRestriction: v })}
                />
              </SettingRow>

              <h3 className="text-white font-medium mb-4 mt-8 pt-4 border-t border-slate-700">Contraseñas</h3>

              <SettingRow
                label="Longitud mínima de contraseña"
                description="Caracteres mínimos requeridos"
              >
                <NumberInput
                  value={security.minPasswordLength}
                  onChange={(v) => setSecurity({ ...security, minPasswordLength: v })}
                  min={6}
                  max={20}
                />
              </SettingRow>

              <SettingRow
                label="Requerir contraseña fuerte"
                description="Mayúsculas, minúsculas, números y símbolos"
              >
                <Toggle
                  enabled={security.requireStrongPassword}
                  onChange={(v) => setSecurity({ ...security, requireStrongPassword: v })}
                />
              </SettingRow>

              <SettingRow
                label="Cambio obligatorio de contraseña"
                description="Días antes de requerir cambio de contraseña"
              >
                <NumberInput
                  value={security.requirePasswordChange}
                  onChange={(v) => setSecurity({ ...security, requirePasswordChange: v })}
                  min={30}
                  max={365}
                  unit="días"
                />
              </SettingRow>

              <h3 className="text-white font-medium mb-4 mt-8 pt-4 border-t border-slate-700">Sesiones</h3>

              <SettingRow
                label="Tiempo de inactividad"
                description="Minutos antes de cerrar sesión por inactividad"
              >
                <NumberInput
                  value={security.sessionTimeoutMinutes}
                  onChange={(v) => setSecurity({ ...security, sessionTimeoutMinutes: v })}
                  min={5}
                  max={480}
                  unit="min"
                />
              </SettingRow>

              <SettingRow
                label="Intentos máximos de login"
                description="Antes de bloquear la cuenta temporalmente"
              >
                <NumberInput
                  value={security.maxLoginAttempts}
                  onChange={(v) => setSecurity({ ...security, maxLoginAttempts: v })}
                  min={3}
                  max={10}
                />
              </SettingRow>

              <SettingRow
                label="Duración del bloqueo"
                description="Minutos de bloqueo tras exceder intentos"
              >
                <NumberInput
                  value={security.lockoutDurationMinutes}
                  onChange={(v) => setSecurity({ ...security, lockoutDurationMinutes: v })}
                  min={5}
                  max={60}
                  unit="min"
                />
              </SettingRow>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => saveSettings('security', security)}
                  disabled={isSaving}
                  className="px-6 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-lg flex items-center gap-2"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NOTIFICATIONS SETTINGS */}
        {activeSection === 'notifications' && notifications && (
          <div className="bg-slate-800 rounded-xl border border-slate-700">
            <div className="p-4 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">Configuración de Notificaciones</h2>
              <p className="text-gray-400 text-sm">Alertas y reportes automáticos</p>
            </div>
            <div className="p-6">
              <SettingRow
                label="Notificaciones por email"
                description="Enviar notificaciones por correo electrónico"
              >
                <Toggle
                  enabled={notifications.enableEmailNotifications}
                  onChange={(v) => setNotifications({ ...notifications, enableEmailNotifications: v })}
                />
              </SettingRow>

              <SettingRow
                label="Notificaciones push"
                description="Enviar notificaciones al navegador"
              >
                <Toggle
                  enabled={notifications.enablePushNotifications}
                  onChange={(v) => setNotifications({ ...notifications, enablePushNotifications: v })}
                />
              </SettingRow>

              <SettingRow
                label="Notificar ausencias a padres"
                description="Enviar email a padres cuando el estudiante falta"
              >
                <Toggle
                  enabled={notifications.notifyAbsenceToParents}
                  onChange={(v) => setNotifications({ ...notifications, notifyAbsenceToParents: v })}
                />
              </SettingRow>

              {notifications.notifyAbsenceToParents && (
                <SettingRow
                  label="Notificar después de"
                  description="Cantidad de ausencias para notificar"
                >
                  <NumberInput
                    value={notifications.notifyAfterAbsences}
                    onChange={(v) => setNotifications({ ...notifications, notifyAfterAbsences: v })}
                    min={1}
                    max={10}
                    unit="faltas"
                  />
                </SettingRow>
              )}

              <h3 className="text-white font-medium mb-4 mt-8 pt-4 border-t border-slate-700">Reportes Automáticos</h3>

              <SettingRow
                label="Reporte diario por email"
                description="Enviar resumen diario de asistencia"
              >
                <Toggle
                  enabled={notifications.dailyReportEmail}
                  onChange={(v) => setNotifications({ ...notifications, dailyReportEmail: v })}
                />
              </SettingRow>

              {notifications.dailyReportEmail && (
                <SettingRow label="Hora del reporte diario" description="Hora de envío del reporte">
                  <input
                    type="time"
                    value={notifications.dailyReportTime}
                    onChange={(e) => setNotifications({ ...notifications, dailyReportTime: e.target.value })}
                    className="px-3 py-1.5 bg-slate-700 border border-slate-600 text-white rounded-lg"
                  />
                </SettingRow>
              )}

              <SettingRow
                label="Reporte semanal por email"
                description="Enviar resumen semanal de asistencia"
              >
                <Toggle
                  enabled={notifications.weeklyReportEmail}
                  onChange={(v) => setNotifications({ ...notifications, weeklyReportEmail: v })}
                />
              </SettingRow>

              {notifications.weeklyReportEmail && (
                <SettingRow label="Día del reporte semanal" description="Día de envío del reporte">
                  <SelectInput
                    value={notifications.weeklyReportDay}
                    onChange={(v) => setNotifications({ ...notifications, weeklyReportDay: v })}
                    options={[
                      { value: 'monday', label: 'Lunes' },
                      { value: 'tuesday', label: 'Martes' },
                      { value: 'wednesday', label: 'Miércoles' },
                      { value: 'thursday', label: 'Jueves' },
                      { value: 'friday', label: 'Viernes' },
                    ]}
                  />
                </SettingRow>
              )}

              <h3 className="text-white font-medium mb-4 mt-8 pt-4 border-t border-slate-700">Alertas</h3>

              <SettingRow
                label="Alerta de baja asistencia"
                description="Notificar cuando un curso tenga baja asistencia"
              >
                <Toggle
                  enabled={notifications.notifyLowAttendance}
                  onChange={(v) => setNotifications({ ...notifications, notifyLowAttendance: v })}
                />
              </SettingRow>

              {notifications.notifyLowAttendance && (
                <SettingRow
                  label="Umbral de asistencia baja"
                  description="Porcentaje mínimo para generar alerta"
                >
                  <NumberInput
                    value={notifications.lowAttendanceThreshold}
                    onChange={(v) => setNotifications({ ...notifications, lowAttendanceThreshold: v })}
                    min={50}
                    max={95}
                    unit="%"
                  />
                </SettingRow>
              )}

              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => saveSettings('notifications', notifications)}
                  disabled={isSaving}
                  className="px-6 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-lg flex items-center gap-2"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        )}

        {/* APPEARANCE SETTINGS */}
        {activeSection === 'appearance' && appearance && (
          <div className="bg-slate-800 rounded-xl border border-slate-700">
            <div className="p-4 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">Configuración de Apariencia</h2>
              <p className="text-gray-400 text-sm">Personalización visual de la aplicación</p>
            </div>
            <div className="p-6">
              <SettingRow
                label="Color primario"
                description="Color principal de la aplicación"
              >
                <input
                  type="color"
                  value={appearance.primaryColor}
                  onChange={(e) => setAppearance({ ...appearance, primaryColor: e.target.value })}
                  className="w-10 h-10 rounded-lg cursor-pointer border-2 border-slate-600"
                />
              </SettingRow>

              <SettingRow
                label="Modo oscuro"
                description="Usar tema oscuro en toda la aplicación"
              >
                <Toggle
                  enabled={appearance.darkMode}
                  onChange={(v) => setAppearance({ ...appearance, darkMode: v })}
                />
              </SettingRow>

              <SettingRow
                label="Modo compacto"
                description="Reducir espaciado para mostrar más contenido"
              >
                <Toggle
                  enabled={appearance.compactMode}
                  onChange={(v) => setAppearance({ ...appearance, compactMode: v })}
                />
              </SettingRow>

              <SettingRow
                label="Mostrar animaciones"
                description="Habilitar transiciones y animaciones"
              >
                <Toggle
                  enabled={appearance.showAnimations}
                  onChange={(v) => setAppearance({ ...appearance, showAnimations: v })}
                />
              </SettingRow>

              <SettingRow label="Idioma" description="Idioma de la interfaz">
                <SelectInput
                  value={appearance.language}
                  onChange={(v) => setAppearance({ ...appearance, language: v })}
                  options={[
                    { value: 'es', label: 'Español' },
                    { value: 'en', label: 'English' },
                    { value: 'pt', label: 'Português' },
                  ]}
                />
              </SettingRow>

              <SettingRow label="Formato de fecha" description="Cómo se muestran las fechas">
                <SelectInput
                  value={appearance.dateFormat}
                  onChange={(v) => setAppearance({ ...appearance, dateFormat: v })}
                  options={[
                    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
                  ]}
                />
              </SettingRow>

              <SettingRow label="Formato de hora" description="12 o 24 horas">
                <SelectInput
                  value={appearance.timeFormat}
                  onChange={(v) => setAppearance({ ...appearance, timeFormat: v })}
                  options={[
                    { value: '24h', label: '24 horas' },
                    { value: '12h', label: '12 horas (AM/PM)' },
                  ]}
                />
              </SettingRow>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => saveSettings('appearance', appearance)}
                  disabled={isSaving}
                  className="px-6 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-lg flex items-center gap-2"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BACKUP SETTINGS */}
        {activeSection === 'backup' && backup && (
          <div className="bg-slate-800 rounded-xl border border-slate-700">
            <div className="p-4 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">Configuración de Respaldo</h2>
              <p className="text-gray-400 text-sm">Copias de seguridad de la base de datos</p>
            </div>
            <div className="p-6">
              {/* Last backup info */}
              <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Último respaldo</p>
                    <p className="text-white font-semibold">
                      {new Date(backup.lastBackup).toLocaleString('es-ES')}
                    </p>
                  </div>
                  <button
                    onClick={runBackup}
                    disabled={isSaving}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg flex items-center gap-2"
                  >
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    )}
                    Respaldar Ahora
                  </button>
                </div>
              </div>

              <SettingRow
                label="Respaldo automático"
                description="Realizar copias de seguridad automáticamente"
              >
                <Toggle
                  enabled={backup.autoBackup}
                  onChange={(v) => setBackup({ ...backup, autoBackup: v })}
                />
              </SettingRow>

              {backup.autoBackup && (
                <>
                  <SettingRow label="Frecuencia" description="Con qué frecuencia realizar respaldos">
                    <SelectInput
                      value={backup.backupFrequency}
                      onChange={(v) => setBackup({ ...backup, backupFrequency: v })}
                      options={[
                        { value: 'hourly', label: 'Cada hora' },
                        { value: 'daily', label: 'Diario' },
                        { value: 'weekly', label: 'Semanal' },
                      ]}
                    />
                  </SettingRow>

                  <SettingRow label="Hora del respaldo" description="Hora para ejecutar el respaldo">
                    <input
                      type="time"
                      value={backup.backupTime}
                      onChange={(e) => setBackup({ ...backup, backupTime: e.target.value })}
                      className="px-3 py-1.5 bg-slate-700 border border-slate-600 text-white rounded-lg"
                    />
                  </SettingRow>
                </>
              )}

              <SettingRow
                label="Retención de respaldos"
                description="Días que se mantienen los respaldos antiguos"
              >
                <NumberInput
                  value={backup.retentionDays}
                  onChange={(v) => setBackup({ ...backup, retentionDays: v })}
                  min={7}
                  max={365}
                  unit="días"
                />
              </SettingRow>

              <SettingRow label="Ubicación de respaldo" description="Dónde almacenar los respaldos">
                <SelectInput
                  value={backup.backupLocation}
                  onChange={(v) => setBackup({ ...backup, backupLocation: v })}
                  options={[
                    { value: 'cloud', label: 'Nube (Supabase)' },
                    { value: 'local', label: 'Servidor local' },
                    { value: 'both', label: 'Ambos' },
                  ]}
                />
              </SettingRow>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => saveSettings('backup', backup)}
                  disabled={isSaving}
                  className="px-6 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-lg flex items-center gap-2"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SYSTEM INFO */}
        {activeSection === 'system' && systemInfo && (
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-xl border border-slate-700">
              <div className="p-4 border-b border-slate-700">
                <h2 className="text-xl font-semibold text-white">Información del Sistema</h2>
                <p className="text-gray-400 text-sm">Estado y versiones del sistema</p>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Versión</p>
                  <p className="text-white text-xl font-bold">{systemInfo.version}</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Ambiente</p>
                  <p className="text-white text-xl font-bold capitalize">{systemInfo.environment}</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Node.js</p>
                  <p className="text-white text-xl font-bold">{systemInfo.nodeVersion}</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Tiempo activo</p>
                  <p className="text-white text-xl font-bold">{formatUptime(systemInfo.uptime)}</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Base de datos</p>
                  <p className="text-white text-xl font-bold">{systemInfo.database?.type}</p>
                  <p className={`text-sm ${systemInfo.database?.status === 'connected' ? 'text-green-400' : 'text-red-400'}`}>
                    {systemInfo.database?.status === 'connected' ? 'Conectada' : 'Desconectada'}
                  </p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Última actualización</p>
                  <p className="text-white text-xl font-bold">{systemInfo.lastUpdate}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl border border-slate-700">
              <div className="p-4 border-b border-slate-700">
                <h2 className="text-xl font-semibold text-white">Uso de Memoria</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Heap Usado</p>
                    <div className="bg-slate-700 rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-purple-500 h-full"
                        style={{ width: `${(systemInfo.memoryUsage?.heapUsed / systemInfo.memoryUsage?.heapTotal) * 100}%` }}
                      />
                    </div>
                    <p className="text-white text-sm mt-1">
                      {Math.round(systemInfo.memoryUsage?.heapUsed / 1024 / 1024)} MB /
                      {Math.round(systemInfo.memoryUsage?.heapTotal / 1024 / 1024)} MB
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">RSS</p>
                    <p className="text-white text-2xl font-bold">
                      {Math.round(systemInfo.memoryUsage?.rss / 1024 / 1024)} MB
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">External</p>
                    <p className="text-white text-2xl font-bold">
                      {Math.round(systemInfo.memoryUsage?.external / 1024 / 1024)} MB
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-500/10 rounded-xl border border-red-500/50">
              <div className="p-4 border-b border-red-500/30">
                <h2 className="text-xl font-semibold text-red-400">Zona de Peligro</h2>
                <p className="text-red-400/70 text-sm">Acciones irreversibles</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Limpiar caché del sistema</p>
                    <p className="text-gray-500 text-sm">Eliminar datos temporales y caché</p>
                  </div>
                  <button className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg">
                    Limpiar Caché
                  </button>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-red-500/20">
                  <div>
                    <p className="text-white font-medium">Restablecer configuración</p>
                    <p className="text-gray-500 text-sm">Volver a los valores predeterminados</p>
                  </div>
                  <button className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg">
                    Restablecer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsModule;
