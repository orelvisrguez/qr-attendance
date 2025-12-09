// ============================================
// ASSIGN PROFESOR MODAL COMPONENT
// Modal para asignar profesores a cursos con materias
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../lib/api';

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Course {
  id: string;
  name: string;
  subjects: Subject[];
}

interface Profesor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface AssignProfesorModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course | null;
}

export const AssignProfesorModal: React.FC<AssignProfesorModalProps> = ({
  isOpen,
  onClose,
  course,
}) => {
  const [profesors, setProfesors] = useState<Profesor[]>([]);
  const [selectedProfesor, setSelectedProfesor] = useState<string>('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch available profesors
  const fetchProfesors = useCallback(async () => {
    setIsFetching(true);
    try {
      // Fetch from users endpoint filtering by PROFESOR role
      const response = await fetch(`${API_URL}/api/users?role=PROFESOR&status=active&limit=100`);
      const data = await response.json();
      if (data.success) {
        setProfesors(data.data.map((u: any) => ({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
        })));
      }
    } catch (err) {
      console.error('Error fetching profesors:', err);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchProfesors();
      setSelectedProfesor('');
      setSelectedSubjects([]);
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, fetchProfesors]);

  const handleSubjectToggle = (subjectId: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleSelectAllSubjects = () => {
    if (course) {
      if (selectedSubjects.length === course.subjects.length) {
        setSelectedSubjects([]);
      } else {
        setSelectedSubjects(course.subjects.map(s => s.id));
      }
    }
  };

  const handleAssign = async () => {
    if (!course || !selectedProfesor) {
      setError('Selecciona un profesor');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/courses/${course.id}/profesors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profesorId: selectedProfesor,
          subjectIds: selectedSubjects,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Profesor asignado exitosamente');
        setSelectedProfesor('');
        setSelectedSubjects([]);
        setTimeout(() => {
          setSuccess(null);
        }, 2000);
      } else {
        setError(data.error || 'Error al asignar');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !course) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-slate-800 rounded-xl border border-slate-700 w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-white">Asignar Profesor</h2>
            <p className="text-gray-400 text-sm">Curso: {course.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Messages */}
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/20 border border-green-500 text-green-200 px-4 py-2 rounded-lg text-sm">
              {success}
            </div>
          )}

          {/* Select Profesor */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">Seleccionar Profesor *</label>
            {isFetching ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              </div>
            ) : profesors.length === 0 ? (
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <p className="text-gray-400">No hay profesores disponibles</p>
                <p className="text-gray-500 text-sm mt-1">Crea profesores desde la sección de usuarios</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {profesors.map((prof) => (
                  <button
                    key={prof.id}
                    type="button"
                    onClick={() => setSelectedProfesor(prof.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      selectedProfesor === prof.id
                        ? 'bg-purple-500/20 border border-purple-500'
                        : 'bg-slate-700/50 border border-transparent hover:bg-slate-700'
                    }`}
                  >
                    <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold shrink-0">
                      {prof.firstName[0]}{prof.lastName[0]}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-white font-medium truncate">
                        {prof.firstName} {prof.lastName}
                      </p>
                      <p className="text-gray-400 text-sm truncate">{prof.email}</p>
                    </div>
                    {selectedProfesor === prof.id && (
                      <svg className="w-5 h-5 text-purple-400 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Select Subjects */}
          {course.subjects.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-gray-400 text-sm">Materias que impartirá</label>
                <button
                  type="button"
                  onClick={handleSelectAllSubjects}
                  className="text-purple-400 text-sm hover:text-purple-300"
                >
                  {selectedSubjects.length === course.subjects.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {course.subjects.map((subject) => (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => handleSubjectToggle(subject.id)}
                    className={`flex items-center gap-2 p-3 rounded-lg transition-colors text-left ${
                      selectedSubjects.includes(subject.id)
                        ? 'bg-blue-500/20 border border-blue-500'
                        : 'bg-slate-700/50 border border-transparent hover:bg-slate-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      selectedSubjects.includes(subject.id)
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-gray-500'
                    }`}>
                      {selectedSubjects.includes(subject.id) && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{subject.name}</p>
                      <p className="text-gray-500 text-xs truncate">{subject.code}</p>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-gray-500 text-xs mt-2">
                {selectedSubjects.length} de {course.subjects.length} materias seleccionadas
              </p>
            </div>
          )}

          {course.subjects.length === 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-200 px-4 py-3 rounded-lg text-sm">
              <p className="font-medium">Sin materias</p>
              <p className="text-yellow-200/70 mt-1">
                Este curso no tiene materias. Puedes asignar el profesor y luego agregar materias.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-slate-700 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={handleAssign}
            disabled={isLoading || !selectedProfesor}
            className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Asignando...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Asignar Profesor
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignProfesorModal;
