// ============================================
// COURSES & SUBJECTS API ROUTES
// CRUD para cursos, materias y asignaciones
// ============================================

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ============================================
// TYPES
// ============================================

interface Course {
  id: string;
  name: string;
  grade: string;
  section: string;
  year: number;
  isActive: boolean;
  createdAt: Date;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  description: string;
  courseId: string;
  createdAt: Date;
}

interface CourseProfesor {
  id: string;
  courseId: string;
  profesorId: string;
  subjectIds: string[]; // Materias que imparte el profesor en ese curso
  assignedAt: Date;
}

interface ProfesorInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

// ============================================
// MOCK DATABASE
// ============================================

let COURSES_DB: Course[] = [
  { id: 'c1', name: '3ro A', grade: '3ro Secundaria', section: 'A', year: 2024, isActive: true, createdAt: new Date('2024-01-01') },
  { id: 'c2', name: '3ro B', grade: '3ro Secundaria', section: 'B', year: 2024, isActive: true, createdAt: new Date('2024-01-01') },
  { id: 'c3', name: '4to A', grade: '4to Secundaria', section: 'A', year: 2024, isActive: true, createdAt: new Date('2024-01-01') },
  { id: 'c4', name: '4to B', grade: '4to Secundaria', section: 'B', year: 2024, isActive: false, createdAt: new Date('2024-01-01') },
];

let SUBJECTS_DB: Subject[] = [
  { id: 's1', name: 'Matemáticas', code: 'MAT-301', description: 'Álgebra y Geometría', courseId: 'c1', createdAt: new Date('2024-01-01') },
  { id: 's2', name: 'Física', code: 'FIS-301', description: 'Mecánica y Termodinámica', courseId: 'c1', createdAt: new Date('2024-01-01') },
  { id: 's3', name: 'Química', code: 'QUI-301', description: 'Química Orgánica', courseId: 'c1', createdAt: new Date('2024-01-01') },
  { id: 's4', name: 'Historia', code: 'HIS-301', description: 'Historia Universal', courseId: 'c1', createdAt: new Date('2024-01-01') },
  { id: 's5', name: 'Matemáticas', code: 'MAT-302', description: 'Álgebra y Geometría', courseId: 'c2', createdAt: new Date('2024-01-01') },
  { id: 's6', name: 'Física', code: 'FIS-302', description: 'Mecánica y Termodinámica', courseId: 'c2', createdAt: new Date('2024-01-01') },
  { id: 's7', name: 'Matemáticas', code: 'MAT-401', description: 'Cálculo', courseId: 'c3', createdAt: new Date('2024-01-01') },
];

let COURSE_PROFESORS_DB: CourseProfesor[] = [
  { id: 'cp1', courseId: 'c1', profesorId: '2', subjectIds: ['s1', 's2'], assignedAt: new Date('2024-01-15') },
  { id: 'cp2', courseId: 'c2', profesorId: '2', subjectIds: ['s5'], assignedAt: new Date('2024-01-15') },
];

// Mock profesores (referencia a users)
const PROFESORS_DB: ProfesorInfo[] = [
  { id: '2', firstName: 'Juan', lastName: 'Pérez', email: 'profesor@demo.com' },
  { id: '3', firstName: 'María', lastName: 'García', email: 'maria.garcia@demo.com' },
];

// ============================================
// COURSES ENDPOINTS
// ============================================

// GET /api/courses - Listar cursos
router.get('/', (_req: Request, res: Response) => {
  try {
    const coursesWithDetails = COURSES_DB.map(course => {
      const subjects = SUBJECTS_DB.filter(s => s.courseId === course.id);
      const assignments = COURSE_PROFESORS_DB.filter(cp => cp.courseId === course.id);
      const profesors = assignments.map(a => {
        const prof = PROFESORS_DB.find(p => p.id === a.profesorId);
        return prof ? { ...prof, subjectIds: a.subjectIds } : null;
      }).filter(Boolean);

      return {
        ...course,
        subjects,
        profesors,
        subjectCount: subjects.length,
        profesorCount: profesors.length,
      };
    });

    res.json({
      success: true,
      data: coursesWithDetails,
      stats: {
        total: COURSES_DB.length,
        active: COURSES_DB.filter(c => c.isActive).length,
        inactive: COURSES_DB.filter(c => !c.isActive).length,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al listar cursos' });
  }
});

// GET /api/courses/:id - Obtener curso con detalle
router.get('/:id', (req: Request, res: Response) => {
  try {
    const course = COURSES_DB.find(c => c.id === req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, error: 'Curso no encontrado' });
    }

    const subjects = SUBJECTS_DB.filter(s => s.courseId === course.id);
    const assignments = COURSE_PROFESORS_DB.filter(cp => cp.courseId === course.id);
    const profesors = assignments.map(a => {
      const prof = PROFESORS_DB.find(p => p.id === a.profesorId);
      const assignedSubjects = subjects.filter(s => a.subjectIds.includes(s.id));
      return prof ? { ...prof, subjects: assignedSubjects, assignmentId: a.id } : null;
    }).filter(Boolean);

    res.json({
      success: true,
      data: { ...course, subjects, profesors }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener curso' });
  }
});

// POST /api/courses - Crear curso
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, grade, section, year } = req.body;

    if (!name || !grade || !section || !year) {
      return res.status(400).json({ success: false, error: 'Todos los campos son requeridos' });
    }

    // Verificar duplicado
    const exists = COURSES_DB.some(c => c.grade === grade && c.section === section && c.year === year);
    if (exists) {
      return res.status(400).json({ success: false, error: 'Ya existe un curso con ese grado, sección y año' });
    }

    const newCourse: Course = {
      id: uuidv4(),
      name,
      grade,
      section,
      year: parseInt(year),
      isActive: true,
      createdAt: new Date(),
    };

    COURSES_DB.push(newCourse);
    res.status(201).json({ success: true, data: newCourse, message: 'Curso creado exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al crear curso' });
  }
});

// PUT /api/courses/:id - Actualizar curso
router.put('/:id', (req: Request, res: Response) => {
  try {
    const index = COURSES_DB.findIndex(c => c.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Curso no encontrado' });
    }

    const { name, grade, section, year, isActive } = req.body;
    COURSES_DB[index] = {
      ...COURSES_DB[index],
      name: name || COURSES_DB[index].name,
      grade: grade || COURSES_DB[index].grade,
      section: section || COURSES_DB[index].section,
      year: year || COURSES_DB[index].year,
      isActive: isActive !== undefined ? isActive : COURSES_DB[index].isActive,
    };

    res.json({ success: true, data: COURSES_DB[index], message: 'Curso actualizado' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al actualizar curso' });
  }
});

// DELETE /api/courses/:id - Eliminar curso
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const index = COURSES_DB.findIndex(c => c.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Curso no encontrado' });
    }

    // Eliminar materias asociadas
    SUBJECTS_DB = SUBJECTS_DB.filter(s => s.courseId !== req.params.id);
    // Eliminar asignaciones
    COURSE_PROFESORS_DB = COURSE_PROFESORS_DB.filter(cp => cp.courseId !== req.params.id);
    // Eliminar curso
    COURSES_DB.splice(index, 1);

    res.json({ success: true, message: 'Curso eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al eliminar curso' });
  }
});

// ============================================
// SUBJECTS ENDPOINTS
// ============================================

// GET /api/courses/:courseId/subjects - Listar materias de un curso
router.get('/:courseId/subjects', (req: Request, res: Response) => {
  try {
    const subjects = SUBJECTS_DB.filter(s => s.courseId === req.params.courseId);
    res.json({ success: true, data: subjects });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al listar materias' });
  }
});

// POST /api/courses/:courseId/subjects - Crear materia
router.post('/:courseId/subjects', (req: Request, res: Response) => {
  try {
    const { name, code, description } = req.body;
    const courseId = req.params.courseId;

    if (!name || !code) {
      return res.status(400).json({ success: false, error: 'Nombre y código son requeridos' });
    }

    const course = COURSES_DB.find(c => c.id === courseId);
    if (!course) {
      return res.status(404).json({ success: false, error: 'Curso no encontrado' });
    }

    // Verificar código único en el curso
    const exists = SUBJECTS_DB.some(s => s.code === code && s.courseId === courseId);
    if (exists) {
      return res.status(400).json({ success: false, error: 'Ya existe una materia con ese código en este curso' });
    }

    const newSubject: Subject = {
      id: uuidv4(),
      name,
      code,
      description: description || '',
      courseId,
      createdAt: new Date(),
    };

    SUBJECTS_DB.push(newSubject);
    res.status(201).json({ success: true, data: newSubject, message: 'Materia creada exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al crear materia' });
  }
});

// PUT /api/courses/:courseId/subjects/:subjectId - Actualizar materia
router.put('/:courseId/subjects/:subjectId', (req: Request, res: Response) => {
  try {
    const index = SUBJECTS_DB.findIndex(s => s.id === req.params.subjectId && s.courseId === req.params.courseId);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Materia no encontrada' });
    }

    const { name, code, description } = req.body;
    SUBJECTS_DB[index] = {
      ...SUBJECTS_DB[index],
      name: name || SUBJECTS_DB[index].name,
      code: code || SUBJECTS_DB[index].code,
      description: description !== undefined ? description : SUBJECTS_DB[index].description,
    };

    res.json({ success: true, data: SUBJECTS_DB[index], message: 'Materia actualizada' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al actualizar materia' });
  }
});

// DELETE /api/courses/:courseId/subjects/:subjectId - Eliminar materia
router.delete('/:courseId/subjects/:subjectId', (req: Request, res: Response) => {
  try {
    const index = SUBJECTS_DB.findIndex(s => s.id === req.params.subjectId);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Materia no encontrada' });
    }

    // Eliminar de asignaciones de profesores
    COURSE_PROFESORS_DB.forEach(cp => {
      cp.subjectIds = cp.subjectIds.filter(id => id !== req.params.subjectId);
    });

    SUBJECTS_DB.splice(index, 1);
    res.json({ success: true, message: 'Materia eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al eliminar materia' });
  }
});

// ============================================
// PROFESOR ASSIGNMENTS ENDPOINTS
// ============================================

// GET /api/courses/:courseId/profesors - Listar profesores asignados
router.get('/:courseId/profesors', (req: Request, res: Response) => {
  try {
    const assignments = COURSE_PROFESORS_DB.filter(cp => cp.courseId === req.params.courseId);
    const subjects = SUBJECTS_DB.filter(s => s.courseId === req.params.courseId);

    const profesorsWithSubjects = assignments.map(a => {
      const prof = PROFESORS_DB.find(p => p.id === a.profesorId);
      const assignedSubjects = subjects.filter(s => a.subjectIds.includes(s.id));
      return {
        ...prof,
        assignmentId: a.id,
        subjects: assignedSubjects,
        assignedAt: a.assignedAt,
      };
    });

    res.json({ success: true, data: profesorsWithSubjects });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al listar profesores' });
  }
});

// GET /api/profesors/available - Listar profesores disponibles para asignar
router.get('/profesors/available', (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: PROFESORS_DB });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al listar profesores' });
  }
});

// POST /api/courses/:courseId/profesors - Asignar profesor a curso
router.post('/:courseId/profesors', (req: Request, res: Response) => {
  try {
    const { profesorId, subjectIds } = req.body;
    const courseId = req.params.courseId;

    if (!profesorId) {
      return res.status(400).json({ success: false, error: 'Profesor es requerido' });
    }

    const course = COURSES_DB.find(c => c.id === courseId);
    if (!course) {
      return res.status(404).json({ success: false, error: 'Curso no encontrado' });
    }

    const profesor = PROFESORS_DB.find(p => p.id === profesorId);
    if (!profesor) {
      return res.status(404).json({ success: false, error: 'Profesor no encontrado' });
    }

    // Verificar si ya está asignado
    const existingAssignment = COURSE_PROFESORS_DB.find(
      cp => cp.courseId === courseId && cp.profesorId === profesorId
    );

    if (existingAssignment) {
      // Actualizar materias asignadas
      existingAssignment.subjectIds = subjectIds || [];
      return res.json({
        success: true,
        data: existingAssignment,
        message: 'Asignación actualizada'
      });
    }

    const newAssignment: CourseProfesor = {
      id: uuidv4(),
      courseId,
      profesorId,
      subjectIds: subjectIds || [],
      assignedAt: new Date(),
    };

    COURSE_PROFESORS_DB.push(newAssignment);

    res.status(201).json({
      success: true,
      data: { ...newAssignment, profesor },
      message: 'Profesor asignado exitosamente'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al asignar profesor' });
  }
});

// PUT /api/courses/:courseId/profesors/:assignmentId - Actualizar asignación
router.put('/:courseId/profesors/:assignmentId', (req: Request, res: Response) => {
  try {
    const index = COURSE_PROFESORS_DB.findIndex(cp => cp.id === req.params.assignmentId);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Asignación no encontrada' });
    }

    const { subjectIds } = req.body;
    COURSE_PROFESORS_DB[index].subjectIds = subjectIds || COURSE_PROFESORS_DB[index].subjectIds;

    res.json({ success: true, data: COURSE_PROFESORS_DB[index], message: 'Asignación actualizada' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al actualizar asignación' });
  }
});

// DELETE /api/courses/:courseId/profesors/:assignmentId - Eliminar asignación
router.delete('/:courseId/profesors/:assignmentId', (req: Request, res: Response) => {
  try {
    const index = COURSE_PROFESORS_DB.findIndex(cp => cp.id === req.params.assignmentId);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Asignación no encontrada' });
    }

    COURSE_PROFESORS_DB.splice(index, 1);
    res.json({ success: true, message: 'Profesor desasignado del curso' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al eliminar asignación' });
  }
});

export default router;
