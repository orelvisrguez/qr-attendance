// ============================================
// COURSE MODAL COMPONENT
// Modal para crear/editar cursos
// ============================================

import React, { useState, useEffect } from 'react';

interface Course {
  id: string;
  name: string;
  grade: string;
  section: string;
  year: number;
  isActive: boolean;
}

interface CourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Course>) => Promise<void>;
  course: Course | null;
  isLoading: boolean;
}

const GRADES = [
  '1ro Primaria', '2do Primaria', '3ro Primaria', '4to Primaria', '5to Primaria', '6to Primaria',
  '1ro Secundaria', '2do Secundaria', '3ro Secundaria', '4to Secundaria', '5to Secundaria',
];

const SECTIONS = ['A', 'B', 'C', 'D', 'E'];

export const CourseModal: React.FC<CourseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  course,
  isLoading,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    section: 'A',
    year: new Date().getFullYear(),
    isActive: true,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (course) {
      setFormData({
        name: course.name,
        grade: course.grade,
        section: course.section,
        year: course.year,
        isActive: course.isActive,
      });
    } else {
      setFormData({
        name: '',
        grade: '',
        section: 'A',
        year: new Date().getFullYear(),
        isActive: true,
      });
    }
    setError(null);
  }, [course, isOpen]);

  // Auto-generate name based on grade and section
  useEffect(() => {
    if (formData.grade && formData.section) {
      const gradeParts = formData.grade.split(' ');
      const shortGrade = gradeParts[0];
      setFormData(prev => ({
        ...prev,
        name: `${shortGrade} ${prev.section}`,
      }));
    }
  }, [formData.grade, formData.section]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name || !formData.grade || !formData.section) {
      setError('Todos los campos son requeridos');
      return;
    }

    try {
      await onSave(formData);
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">
            {course ? 'Editar Curso' : 'Nuevo Curso'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Grade */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">Grado *</label>
            <select
              value={formData.grade}
              onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Seleccionar grado...</option>
              {GRADES.map((grade) => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">Sección *</label>
            <div className="flex gap-2">
              {SECTIONS.map((section) => (
                <button
                  key={section}
                  type="button"
                  onClick={() => setFormData({ ...formData, section })}
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                    formData.section === section
                      ? 'bg-purple-500 text-white'
                      : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                  }`}
                >
                  {section}
                </button>
              ))}
            </div>
          </div>

          {/* Name (auto-generated) */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">Nombre del Curso</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Ej: 3ro A"
            />
          </div>

          {/* Year */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">Año Lectivo *</label>
            <input
              type="number"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
              min={2020}
              max={2030}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Active Toggle */}
          {course && (
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Estado del curso</span>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  formData.isActive ? 'bg-green-500' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    formData.isActive ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CourseModal;
