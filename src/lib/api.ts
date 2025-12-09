// ============================================
// API Configuration
// Centralized API URL for all components
// ============================================

// En producción (Vercel), la API está en el mismo dominio (/api/...)
// En desarrollo, usamos el servidor Express en localhost:3001
export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');

// Helper para hacer fetch con manejo de errores
export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<{ data?: T; error?: string }> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.message || `Error ${response.status}` };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('API Error:', error);
    return { error: 'Error de conexión' };
  }
}
