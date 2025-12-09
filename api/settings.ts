// ============================================
// SETTINGS API - Vercel Serverless Function
// Configuración del sistema con Supabase
// ============================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin, isSupabaseConfigured } from './_lib/supabase.js';

// CORS headers helper
function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PUT,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
}

// Valores por defecto para configuraciones
const DEFAULT_SETTINGS = {
  school: {
    schoolName: 'Mi Colegio',
    schoolLogo: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    currentYear: new Date().getFullYear(),
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
    allowedIpRanges: [],
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
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verificar que Supabase está configurado
  if (!isSupabaseConfigured) {
    return res.status(503).json({
      success: false,
      error: 'Base de datos no configurada.',
    });
  }

  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const section = pathParts[pathParts.length - 1] !== 'settings' ? pathParts[pathParts.length - 1] : null;

  // ============================================
  // GET /api/settings - Obtener todas las configuraciones
  // ============================================
  if (req.method === 'GET' && !section) {
    try {
      const { data: settings, error } = await supabaseAdmin
        .from('settings')
        .select('key, value');

      if (error) {
        console.error('Error obteniendo configuraciones:', error);
        // Si la tabla no existe, devolver valores por defecto
        return res.status(200).json({
          success: true,
          data: DEFAULT_SETTINGS,
        });
      }

      // Convertir array a objeto
      const settingsObj: Record<string, unknown> = { ...DEFAULT_SETTINGS };
      (settings || []).forEach((s) => {
        try {
          settingsObj[s.key] = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
        } catch {
          settingsObj[s.key] = s.value;
        }
      });

      return res.status(200).json({
        success: true,
        data: settingsObj,
      });
    } catch (error) {
      console.error('Error en GET /api/settings:', error);
      return res.status(200).json({
        success: true,
        data: DEFAULT_SETTINGS,
      });
    }
  }

  // ============================================
  // GET /api/settings/:section - Obtener sección específica
  // ============================================
  if (req.method === 'GET' && section) {
    try {
      // Caso especial para información del sistema
      if (section === 'system') {
        // Obtener estadísticas de la base de datos
        const [usersCount, coursesCount, sessionsCount] = await Promise.all([
          supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
          supabaseAdmin.from('courses').select('*', { count: 'exact', head: true }),
          supabaseAdmin.from('attendance_sessions').select('*', { count: 'exact', head: true }),
        ]);

        return res.status(200).json({
          success: true,
          data: {
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'production',
            database: {
              status: 'connected',
              type: 'PostgreSQL (Supabase)',
              users: usersCount.count || 0,
              courses: coursesCount.count || 0,
              sessions: sessionsCount.count || 0,
            },
            lastUpdate: new Date().toISOString(),
          },
        });
      }

      const { data: setting, error } = await supabaseAdmin
        .from('settings')
        .select('value')
        .eq('key', section)
        .single();

      if (error || !setting) {
        // Devolver valor por defecto si existe
        const defaultValue = DEFAULT_SETTINGS[section as keyof typeof DEFAULT_SETTINGS];
        if (defaultValue) {
          return res.status(200).json({
            success: true,
            data: defaultValue,
          });
        }
        return res.status(404).json({
          success: false,
          error: 'Sección no encontrada',
        });
      }

      return res.status(200).json({
        success: true,
        data: typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value,
      });
    } catch (error) {
      console.error('Error en GET /api/settings/:section:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // ============================================
  // PUT /api/settings/:section - Actualizar configuración
  // ============================================
  if (req.method === 'PUT' && section) {
    try {
      const newValue = req.body;

      // Verificar que la sección existe en defaults
      if (!DEFAULT_SETTINGS[section as keyof typeof DEFAULT_SETTINGS] && section !== 'system') {
        return res.status(404).json({
          success: false,
          error: 'Sección no encontrada',
        });
      }

      // Upsert la configuración
      const { error } = await supabaseAdmin
        .from('settings')
        .upsert({
          key: section,
          value: JSON.stringify(newValue),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'key',
        });

      if (error) {
        console.error('Error actualizando configuración:', error);
        return res.status(500).json({
          success: false,
          error: 'Error al actualizar configuración',
        });
      }

      return res.status(200).json({
        success: true,
        data: newValue,
        message: `Configuración de ${section} actualizada`,
      });
    } catch (error) {
      console.error('Error en PUT /api/settings/:section:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // ============================================
  // POST /api/settings/reset - Restablecer configuraciones
  // ============================================
  if (req.method === 'POST' && section === 'reset') {
    try {
      const { sections } = req.body;

      if (sections && Array.isArray(sections)) {
        // Restablecer secciones específicas
        for (const sectionKey of sections) {
          const defaultValue = DEFAULT_SETTINGS[sectionKey as keyof typeof DEFAULT_SETTINGS];
          if (defaultValue) {
            await supabaseAdmin
              .from('settings')
              .upsert({
                key: sectionKey,
                value: JSON.stringify(defaultValue),
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'key',
              });
          }
        }
      } else {
        // Restablecer todas las configuraciones
        for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
          await supabaseAdmin
            .from('settings')
            .upsert({
              key,
              value: JSON.stringify(value),
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'key',
            });
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Configuraciones restablecidas',
        data: DEFAULT_SETTINGS,
      });
    } catch (error) {
      console.error('Error en POST /api/settings/reset:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
