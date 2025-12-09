// ============================================
// QR ATTENDANCE SYSTEM - CRYPTOGRAPHY MODULE
// Lógica de encriptación/desencriptación de tokens QR
// ============================================

import { EncryptJWT, jwtDecrypt, base64url } from 'jose';
import type { QRPayload, QRTokenData, QRValidationResult } from '../types';

// ============================================
// CONFIGURATION
// ============================================

// Clave maestra para encriptación (en producción: variable de entorno)
const MASTER_KEY = process.env.QR_ENCRYPTION_KEY || 'your-32-character-secret-key!!';

// Convertir clave a formato requerido por jose
const getEncryptionKey = async (): Promise<Uint8Array> => {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(MASTER_KEY.padEnd(32, '0').slice(0, 32));
  return keyData;
};

// ============================================
// NONCE GENERATOR
// Genera un nonce único para cada token QR
// ============================================

export const generateNonce = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64url.encode(array);
};

// ============================================
// SESSION SECRET GENERATOR
// Genera un secreto único para cada sesión de asistencia
// ============================================

export const generateSessionSecret = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// ============================================
// QR TOKEN GENERATOR
// Genera un token encriptado para el código QR
// ============================================

export const generateQRToken = async (
  sessionId: string,
  sessionSecret: string,
  validForSeconds: number = 10
): Promise<QRTokenData> => {
  const now = Date.now();
  const nonce = generateNonce();
  const expiresAt = now + (validForSeconds * 1000);

  const payload: QRPayload = {
    sid: sessionId,
    ts: now,
    n: nonce,
  };

  // Crear clave derivada combinando master key con session secret
  const encoder = new TextEncoder();
  const combinedKey = MASTER_KEY + sessionSecret;
  const keyData = encoder.encode(combinedKey.slice(0, 32));

  // Encriptar payload usando JWE (JSON Web Encryption)
  const token = await new EncryptJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt / 1000))
    .encrypt(keyData);

  return {
    token,
    expiresAt,
    nonce,
  };
};

// ============================================
// QR TOKEN VALIDATOR
// Valida un token escaneado por el alumno
// ============================================

export const validateQRToken = async (
  token: string,
  sessionId: string,
  sessionSecret: string,
  maxAgeSeconds: number = 10
): Promise<QRValidationResult> => {
  try {
    // Crear clave derivada
    const encoder = new TextEncoder();
    const combinedKey = MASTER_KEY + sessionSecret;
    const keyData = encoder.encode(combinedKey.slice(0, 32));

    // Desencriptar token
    const { payload } = await jwtDecrypt(token, keyData);

    const qrPayload = payload as unknown as QRPayload;

    // Validar que el session ID coincida
    if (qrPayload.sid !== sessionId) {
      return {
        valid: false,
        error: 'Token no corresponde a esta sesión',
        payload: qrPayload,
      };
    }

    // Validar timestamp (CRÍTICO para anti-fraude)
    const tokenAge = Date.now() - qrPayload.ts;
    const maxAgeMs = maxAgeSeconds * 1000;

    if (tokenAge > maxAgeMs) {
      return {
        valid: false,
        error: `Código expirado (${Math.floor(tokenAge / 1000)}s de antigüedad)`,
        payload: qrPayload,
        isExpired: true,
      };
    }

    // Token válido
    return {
      valid: true,
      payload: qrPayload,
    };
  } catch (error) {
    // Error de desencriptación (token manipulado o inválido)
    return {
      valid: false,
      error: 'Token inválido o corrupto',
    };
  }
};

// ============================================
// DEVICE FINGERPRINT HASHER
// Genera un hash del fingerprint del dispositivo
// ============================================

export const hashFingerprint = async (fingerprint: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprint + MASTER_KEY);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// ============================================
// IP VALIDATION HELPER
// Valida si una IP está en el rango permitido
// ============================================

export const isIPAllowed = (
  clientIP: string,
  allowedRanges: string[]
): boolean => {
  if (allowedRanges.length === 0) return true;

  // Implementación simplificada - en producción usar librería como 'ip-range-check'
  for (const range of allowedRanges) {
    // Soporte para IP exacta
    if (range === clientIP) return true;

    // Soporte para CIDR básico (ej: "192.168.1.0/24")
    if (range.includes('/')) {
      const [network, bits] = range.split('/');
      const networkParts = network.split('.').map(Number);
      const clientParts = clientIP.split('.').map(Number);
      const mask = parseInt(bits, 10);

      // Calcular bytes a comparar
      const fullBytes = Math.floor(mask / 8);
      let match = true;

      for (let i = 0; i < fullBytes && match; i++) {
        if (networkParts[i] !== clientParts[i]) {
          match = false;
        }
      }

      if (match) return true;
    }
  }

  return false;
};
