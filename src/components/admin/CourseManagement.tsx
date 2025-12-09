// ============================================
// COURSE MANAGEMENT COMPONENT
// Gestión de cursos, materias y asignación de profesores
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { CourseModal } from './CourseModal';
import { SubjectModal } from './SubjectModal';
import { AssignProfesorModal } from './AssignProfesorModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Subject {
  id: string;
  name: string;
  code: string;
  description: string;
  courseId: string;
}

interface ProfesorAssignment {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  assignmentId: string;
  subjects: Subject[];
}

interface Course {
  id: string;
  name: string;
  grade: string;
  section: string;
  year: number;
  isActive: boolean;
  subjects: Subject[];
  profesors: ProfesorAssignment[];
  subjectCount: number;
  profesorCount: number;
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
}

export const CourseManagement: React.FC = () => {
  // State
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  // Modals
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch courses
  const fetchCourses = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/courses`);
      const data = await response.json();
      if (data.success) {
        setCourses(data.data);
        setStats(data.stats);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Course handlers
  const handleCreateCourse = () => {
    setSelectedCourse(null);
    setIsCourseModalOpen(true);
  };

  const handleEditCourse = (course: Course) => {
    setSelectedCourse(course);
    setIsCourseModalOpen(true);
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('¿Eliminar este curso y todas sus materias?')) return;

    setActionLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/courses/${courseId}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        fetchCourses();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error al eliminar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveCourse = async (courseData: Partial<Course>) => {
    setActionLoading(true);
    try {
      const isEdit = !!selectedCourse;
      const url = isEdit ? `${API_URL}/api/courses/${selectedCourse.id}` : `${API_URL}/api/courses`;
      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courseData),
      });
      const data = await response.json();
      if (data.success) {
        setIsCourseModalOpen(false);
        fetchCourses();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  // Subject handlers
  const handleAddSubject = (course: Course) => {
    setSelectedCourse(course);
    setSelectedSubject(null);
    setIsSubjectModalOpen(true);
  };

  const handleEditSubject = (course: Course, subject: Subject) => {
    setSelectedCourse(course);
    setSelectedSubject(subject);
    setIsSubjectModalOpen(true);
  };

  const handleDeleteSubject = async (courseId: string, subjectId: string) => {
    if (!confirm('¿Eliminar esta materia?')) return;

    try {
      const response = await fetch(`${API_URL}/api/courses/${courseId}/subjects/${subjectId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        fetchCourses();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error al eliminar materia');
    }
  };

  const handleSaveSubject = async (subjectData: Partial<Subject>) => {
    if (!selectedCourse) return;

    setActionLoading(true);
    try {
      const isEdit = !!selectedSubject;
      const url = isEdit
        ? `${API_URL}/api/courses/${selectedCourse.id}/subjects/${selectedSubject.id}`
        : `${API_URL}/api/courses/${selectedCourse.id}/subjects`;

      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subjectData),
      });
      const data = await response.json();
      if (data.success) {
        setIsSubjectModalOpen(false);
        fetchCourses();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  // Profesor assignment handlers
  const handleAssignProfesor = (course: Course) => {
    setSelectedCourse(course);
    setIsAssignModalOpen(true);
  };

  const handleRemoveProfesor = async (courseId: string, assignmentId: string) => {
    if (!confirm('¿Desasignar este profesor del curso?')) return;

    try {
      const response = await fetch(`${API_URL}/api/courses/${courseId}/profesors/${assignmentId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        fetchCourses();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error al desasignar profesor');
    }
  };

  const toggleExpand = (courseId: string) => {
    setExpandedCourse(expandedCourse === courseId ? null : courseId);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <p className="text-gray-400 text-sm">Total Cursos</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <p className="text-gray-400 text-sm">Activos</p>
            <p className="text-2xl font-bold text-green-400">{stats.active}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <p className="text-gray-400 text-sm">Inactivos</p>
            <p className="text-2xl font-bold text-red-400">{stats.inactive}</p>
          </div>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Cursos y Materias</h2>
        <button
          onClick={handleCreateCourse}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nuevo Curso
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="float-right">&times;</button>
        </div>
      )}

      {/* Courses List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-12 border border-slate-700 text-center">
          <p className="text-gray-400">No hay cursos creados</p>
        </div>
      ) : (
        <div className="space-y-4">
          {courses.map((course) => (
            <div key={course.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              {/* Course Header */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5"
                onClick={() => toggleExpand(course.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${course.isActive ? 'bg-green-500' : 'bg-gray-500'}`} />
                  <div>
                    <h3 className="text-white font-semibold text-lg">{course.name}</h3>
                    <p className="text-gray-400 text-sm">{course.grade} • {course.year}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-white font-semibold">{course.subjectCount}</p>
                    <p className="text-gray-400 text-xs">Materias</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white font-semibold">{course.profesorCount}</p>
                    <p className="text-gray-400 text-xs">Profesores</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEditCourse(course); }}
                      className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg"
                      title="Editar curso"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course.id); }}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                      title="Eliminar curso"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${expandedCourse === course.id ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedCourse === course.id && (
                <div className="border-t border-slate-700 p-4 space-y-6">
                  {/* Subjects Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-white font-medium">Materias</h4>
                      <button
                        onClick={() => handleAddSubject(course)}
                        className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30 flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Agregar Materia
                      </button>
                    </div>

                    {course.subjects.length === 0 ? (
                      <p className="text-gray-400 text-sm">Sin materias asignadas</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {course.subjects.map((subject) => (
                          <div
                            key={subject.id}
                            className="flex items-center justify-between bg-slate-700/50 px-3 py-2 rounded-lg"
                          >
                            <div>
                              <p className="text-white text-sm font-medium">{subject.name}</p>
                              <p className="text-gray-400 text-xs">{subject.code}</p>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleEditSubject(course, subject)}
                                className="p-1 text-gray-400 hover:text-white"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteSubject(course.id, subject.id)}
                                className="p-1 text-gray-400 hover:text-red-400"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Profesors Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-white font-medium">Profesores Asignados</h4>
                      <button
                        onClick={() => handleAssignProfesor(course)}
                        className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30 flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        Asignar Profesor
                      </button>
                    </div>

                    {course.profesors.length === 0 ? (
                      <p className="text-gray-400 text-sm">Sin profesores asignados</p>
                    ) : (
                      <div className="space-y-2">
                        {course.profesors.map((prof) => (
                          <div
                            key={prof.assignmentId}
                            className="flex items-center justify-between bg-slate-700/50 px-3 py-2 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                {prof.firstName[0]}{prof.lastName[0]}
                              </div>
                              <div>
                                <p className="text-white text-sm font-medium">
                                  {prof.firstName} {prof.lastName}
                                </p>
                                <p className="text-gray-400 text-xs">
                                  {prof.subjects.length > 0
                                    ? prof.subjects.map(s => s.name).join(', ')
                                    : 'Sin materias asignadas'}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveProfesor(course.id, prof.assignmentId)}
                              className="p-1 text-gray-400 hover:text-red-400"
                              title="Desasignar profesor"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <CourseModal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        onSave={handleSaveCourse}
        course={selectedCourse}
        isLoading={actionLoading}
      />

      <SubjectModal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        onSave={handleSaveSubject}
        subject={selectedSubject}
        courseName={selectedCourse?.name || ''}
        isLoading={actionLoading}
      />

      <AssignProfesorModal
        isOpen={isAssignModalOpen}
        onClose={() => { setIsAssignModalOpen(false); fetchCourses(); }}
        course={selectedCourse}
      />
    </div>
  );
};

export default CourseManagement;
