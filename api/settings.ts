// ============================================
// SETTINGS API - Vercel Serverless Function
// ============================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Settings data (in production, this would come from Supabase)
const settings = {
  school: {
    schoolName: 'Colegio Demo',
    schoolLogo: '',
    address: 'Av. Principal 123, Ciudad',
    phone: '+51 999 888 777',
    email: 'contacto@colegiodemo.edu',
    website: 'www.colegiodemo.edu',
    currentYear: 2025,
    timezone: 'America/Lima',
  },
  attendance: {
    qrRotationInterval: 7,
    validationWindow: 10,
    allowLateCheckIn: true,
    lateThresholdMinutes: 15,
    autoCloseSessionMinutes: 120,
    requireLocation: false,
    maxLocationRadius: 500,
  },
  security: {
    enableDeviceFingerprint: true,
    enableIpRestriction: false,
    allowedIpRanges: ['192.168.1.0/24'],
    maxDevicesPerStudent: 2,
    enableAntiReplay: true,
    tokenExpirationSeconds: 10,
    requirePasswordChange: 90,
    minPasswordLength: 8,
    requireStrongPassword: true,
    sessionTimeoutMinutes: 60,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
  },
  notifications: {
    enableEmailNotifications: true,
    enablePushNotifications: false,
    notifyAbsenceToParents: true,
    notifyAfterAbsences: 3,
    dailyReportEmail: true,
    dailyReportTime: '18:00',
    weeklyReportEmail: true,
    weeklyReportDay: 'friday',
    notifyLowAttendance: true,
    lowAttendanceThreshold: 80,
  },
  appearance: {
    primaryColor: '#8B5CF6',
    darkMode: true,
    compactMode: false,
    showAnimations: true,
    language: 'es',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
  },
  backup: {
    autoBackup: true,
    backupFrequency: 'daily',
    backupTime: '02:00',
    retentionDays: 30,
    lastBackup: new Date().toISOString(),
    backupLocation: 'cloud',
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PUT,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { section } = req.query;

  // GET /api/settings - Get all settings
  if (req.method === 'GET' && !section) {
    return res.status(200).json({ success: true, data: settings });
  }

  // GET /api/settings/:section
  if (req.method === 'GET' && section) {
    if (section === 'system') {
      return res.status(200).json({
        success: true,
        data: {
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'production',
          nodeVersion: process.version,
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          database: { status: 'connected', type: 'PostgreSQL (Supabase)' },
          lastUpdate: '2025-01-15',
        },
      });
    }

    const sectionData = settings[section as keyof typeof settings];
    if (!sectionData) {
      return res.status(404).json({ success: false, error: 'Sección no encontrada' });
    }
    return res.status(200).json({ success: true, data: sectionData });
  }

  // PUT /api/settings/:section - Update settings
  if (req.method === 'PUT' && section) {
    const sectionKey = section as keyof typeof settings;
    if (!settings[sectionKey]) {
      return res.status(404).json({ success: false, error: 'Sección no encontrada' });
    }

    // In production, save to Supabase
    Object.assign(settings[sectionKey], req.body);

    return res.status(200).json({
      success: true,
      data: settings[sectionKey],
      message: `Configuración de ${section} actualizada`,
    });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
