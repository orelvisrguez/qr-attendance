// ============================================
// PRISMA CLIENT SINGLETON
// Configuración del cliente Prisma para evitar
// múltiples instancias en desarrollo
// ============================================

// Note: PrismaClient is only available after running `prisma generate`
// For now, we export a placeholder to prevent build errors
// In production with database, uncomment the actual implementation

// import { PrismaClient } from '@prisma/client';
//
// declare global {
//   var prisma: PrismaClient | undefined;
// }
//
// export const prisma =
//   globalThis.prisma ||
//   new PrismaClient({
//     log:
//       process.env.NODE_ENV === 'development'
//         ? ['query', 'error', 'warn']
//         : ['error'],
//   });
//
// if (process.env.NODE_ENV !== 'production') {
//   globalThis.prisma = prisma;
// }

// Placeholder export - replace with actual PrismaClient when database is configured
export const prisma = null;
export default prisma;
