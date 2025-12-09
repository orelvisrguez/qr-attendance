// ============================================
// DATABASE SEED
// Script para poblar la base de datos con datos iniciales
// ============================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...\n');

  // Limpiar datos existentes
  await prisma.attendance.deleteMany();
  await prisma.usedToken.deleteMany();
  await prisma.attendanceSession.deleteMany();
  await prisma.deviceFingerprint.deleteMany();
  await prisma.courseStudent.deleteMany();
  await prisma.courseProfesor.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();
  await prisma.schoolConfig.deleteMany();

  console.log('✓ Datos anteriores eliminados\n');

  // Crear configuración de la escuela
  const schoolConfig = await prisma.schoolConfig.create({
    data: {
      name: 'Colegio Demo QR Attendance',
      allowedIPs: ['192.168.1.0/24', '10.0.0.0/8'],
      enforceIPCheck: false,
      lateThresholdMinutes: 15,
      maxDevicesPerStudent: 2,
    },
  });
  console.log('✓ Configuración de escuela creada');

  // Hash de contraseña común para demo
  const hashedPassword = await bcrypt.hash('demo123', 12);

  // Crear usuarios Admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      password: hashedPassword,
      firstName: 'Administrador',
      lastName: 'Sistema',
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('✓ Usuario Admin creado: admin@demo.com');

  // Crear usuarios Profesores
  const profesores = await Promise.all([
    prisma.user.create({
      data: {
        email: 'profesor@demo.com',
        password: hashedPassword,
        firstName: 'Juan',
        lastName: 'Pérez',
        role: 'PROFESOR',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'maria.garcia@demo.com',
        password: hashedPassword,
        firstName: 'María',
        lastName: 'García',
        role: 'PROFESOR',
        isActive: true,
      },
    }),
  ]);
  console.log('✓ 2 Profesores creados');

  // Crear usuarios Alumnos
  const alumnos = await Promise.all([
    prisma.user.create({
      data: {
        email: 'alumno@demo.com',
        password: hashedPassword,
        firstName: 'Carlos',
        lastName: 'López',
        role: 'ALUMNO',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'ana.martinez@demo.com',
        password: hashedPassword,
        firstName: 'Ana',
        lastName: 'Martínez',
        role: 'ALUMNO',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'pedro.sanchez@demo.com',
        password: hashedPassword,
        firstName: 'Pedro',
        lastName: 'Sánchez',
        role: 'ALUMNO',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'lucia.fernandez@demo.com',
        password: hashedPassword,
        firstName: 'Lucía',
        lastName: 'Fernández',
        role: 'ALUMNO',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'diego.rodriguez@demo.com',
        password: hashedPassword,
        firstName: 'Diego',
        lastName: 'Rodríguez',
        role: 'ALUMNO',
        isActive: true,
      },
    }),
  ]);
  console.log('✓ 5 Alumnos creados');

  // Crear Cursos
  const cursos = await Promise.all([
    prisma.course.create({
      data: {
        name: '3ro A',
        grade: '3ro Secundaria',
        section: 'A',
        year: 2024,
        isActive: true,
      },
    }),
    prisma.course.create({
      data: {
        name: '3ro B',
        grade: '3ro Secundaria',
        section: 'B',
        year: 2024,
        isActive: true,
      },
    }),
    prisma.course.create({
      data: {
        name: '4to A',
        grade: '4to Secundaria',
        section: 'A',
        year: 2024,
        isActive: true,
      },
    }),
  ]);
  console.log('✓ 3 Cursos creados');

  // Crear Materias
  const materias = await Promise.all([
    prisma.subject.create({
      data: {
        name: 'Matemáticas',
        code: 'MAT-301',
        description: 'Álgebra y Geometría',
        courseId: cursos[0].id,
      },
    }),
    prisma.subject.create({
      data: {
        name: 'Física',
        code: 'FIS-301',
        description: 'Mecánica y Termodinámica',
        courseId: cursos[0].id,
      },
    }),
    prisma.subject.create({
      data: {
        name: 'Química',
        code: 'QUI-301',
        description: 'Química Orgánica',
        courseId: cursos[0].id,
      },
    }),
    prisma.subject.create({
      data: {
        name: 'Historia',
        code: 'HIS-301',
        description: 'Historia Universal',
        courseId: cursos[0].id,
      },
    }),
  ]);
  console.log('✓ 4 Materias creadas');

  // Asignar profesores a cursos
  await prisma.courseProfesor.create({
    data: {
      courseId: cursos[0].id,
      profesorId: profesores[0].id,
    },
  });
  await prisma.courseProfesor.create({
    data: {
      courseId: cursos[1].id,
      profesorId: profesores[1].id,
    },
  });
  console.log('✓ Profesores asignados a cursos');

  // Inscribir alumnos en cursos
  for (const alumno of alumnos) {
    await prisma.courseStudent.create({
      data: {
        courseId: cursos[0].id,
        studentId: alumno.id,
      },
    });
  }
  console.log('✓ Alumnos inscritos en cursos');

  console.log('\n🎉 Seed completado exitosamente!\n');
  console.log('═══════════════════════════════════════');
  console.log('CREDENCIALES DE ACCESO:');
  console.log('═══════════════════════════════════════');
  console.log('Admin:    admin@demo.com / demo123');
  console.log('Profesor: profesor@demo.com / demo123');
  console.log('Alumno:   alumno@demo.com / demo123');
  console.log('═══════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
