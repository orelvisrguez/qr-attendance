// ============================================
// SETTINGS API ROUTES
// Endpoints para configuración del sistema
// ============================================

import { Router, Request, Response } from 'express';

const router = Router();

// ============================================
// MOCK SETTINGS DATA
// ============================================

let schoolSettings = {
  schoolName: 'Colegio Demo',
  schoolLogo: '',
  address: 'Av. Principal 123, Ciudad',
  phone: '+51 999 888 777',
  email: 'contacto@colegiodemo.edu',
  website: 'www.colegiodemo.edu',
  currentYear: 2025,
  timezone: 'America/Lima',
};

let attendanceSettings = {
  qrRotationInterval: 7, // seconds
  validationWindow: 10, // seconds
  allowLateCheckIn: true,
  lateThresholdMinutes: 15,
  autoCloseSessionMinutes: 120,
  requireLocation: false,
  maxLocationRadius: 500, // meters
};

let securitySettings = {
  enableDeviceFingerprint: true,
  enableIpRestriction: false,
  allowedIpRanges: ['192.168.1.0/24'],
  maxDevicesPerStudent: 2,
  enableAntiReplay: true,
  tokenExpirationSeconds: 10,
  requirePasswordChange: 90, // days
  minPasswordLength: 8,
  requireStrongPassword: true,
  sessionTimeoutMinutes: 60,
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 15,
};

let notificationSettings = {
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
};

let appearanceSettings = {
  primaryColor: '#8B5CF6', // purple-500
  darkMode: true,
  compactMode: false,
  showAnimations: true,
  language: 'es',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h',
};

let backupSettings = {
  autoBackup: true,
  backupFrequency: 'daily',
  backupTime: '02:00',
  retentionDays: 30,
  lastBackup: new Date().toISOString(),
  backupLocation: 'cloud',
};

// ============================================
// SETTINGS ENDPOINTS
// ============================================

// GET /api/settings - Get all settings
router.get('/', (_req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        school: schoolSettings,
        attendance: attendanceSettings,
        security: securitySettings,
        notifications: notificationSettings,
        appearance: appearanceSettings,
        backup: backupSettings,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener configuración' });
  }
});

// GET /api/settings/:section - Get specific section
router.get('/:section', (req: Request, res: Response) => {
  try {
    const { section } = req.params;

    const settingsMap: Record<string, any> = {
      school: schoolSettings,
      attendance: attendanceSettings,
      security: securitySettings,
      notifications: notificationSettings,
      appearance: appearanceSettings,
      backup: backupSettings,
    };

    if (!settingsMap[section]) {
      return res.status(404).json({ success: false, error: 'Sección no encontrada' });
    }

    res.json({ success: true, data: settingsMap[section] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener configuración' });
  }
});

// PUT /api/settings/school - Update school settings
router.put('/school', (req: Request, res: Response) => {
  try {
    schoolSettings = { ...schoolSettings, ...req.body };
    res.json({ success: true, data: schoolSettings, message: 'Configuración de escuela actualizada' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al actualizar' });
  }
});

// PUT /api/settings/attendance - Update attendance settings
router.put('/attendance', (req: Request, res: Response) => {
  try {
    attendanceSettings = { ...attendanceSettings, ...req.body };
    res.json({ success: true, data: attendanceSettings, message: 'Configuración de asistencia actualizada' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al actualizar' });
  }
});

// PUT /api/settings/security - Update security settings
router.put('/security', (req: Request, res: Response) => {
  try {
    securitySettings = { ...securitySettings, ...req.body };
    res.json({ success: true, data: securitySettings, message: 'Configuración de seguridad actualizada' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al actualizar' });
  }
});

// PUT /api/settings/notifications - Update notification settings
router.put('/notifications', (req: Request, res: Response) => {
  try {
    notificationSettings = { ...notificationSettings, ...req.body };
    res.json({ success: true, data: notificationSettings, message: 'Configuración de notificaciones actualizada' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al actualizar' });
  }
});

// PUT /api/settings/appearance - Update appearance settings
router.put('/appearance', (req: Request, res: Response) => {
  try {
    appearanceSettings = { ...appearanceSettings, ...req.body };
    res.json({ success: true, data: appearanceSettings, message: 'Configuración de apariencia actualizada' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al actualizar' });
  }
});

// PUT /api/settings/backup - Update backup settings
router.put('/backup', (req: Request, res: Response) => {
  try {
    backupSettings = { ...backupSettings, ...req.body };
    res.json({ success: true, data: backupSettings, message: 'Configuración de respaldo actualizada' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al actualizar' });
  }
});

// POST /api/settings/backup/run - Run manual backup
router.post('/backup/run', (_req: Request, res: Response) => {
  try {
    // Simulate backup process
    backupSettings.lastBackup = new Date().toISOString();
    res.json({ success: true, message: 'Respaldo completado exitosamente', lastBackup: backupSettings.lastBackup });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al realizar respaldo' });
  }
});

// POST /api/settings/reset - Reset settings to defaults
router.post('/reset/:section', (req: Request, res: Response) => {
  try {
    const { section } = req.params;

    // Reset to defaults (in a real app, these would come from a defaults file)
    if (section === 'attendance') {
      attendanceSettings = {
        qrRotationInterval: 7,
        validationWindow: 10,
        allowLateCheckIn: true,
        lateThresholdMinutes: 15,
        autoCloseSessionMinutes: 120,
        requireLocation: false,
        maxLocationRadius: 500,
      };
    }

    res.json({ success: true, message: `Configuración de ${section} restablecida` });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al restablecer' });
  }
});

// GET /api/settings/system/info - Get system information
router.get('/system/info', (_req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        database: {
          status: 'connected',
          type: 'PostgreSQL (Supabase)',
        },
        lastUpdate: '2025-01-15',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener información del sistema' });
  }
});

export default router;
