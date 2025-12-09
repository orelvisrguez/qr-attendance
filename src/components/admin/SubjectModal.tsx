// ============================================
// SUBJECT MODAL COMPONENT
// Modal para crear/editar materias
// ============================================

import React, { useState, useEffect } from 'react';

interface Subject {
  id: string;
  name: string;
  code: string;
  description: string;
  courseId: string;
}

interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Subject>) => Promise<void>;
  subject: Subject | null;
  courseName: string;
  isLoading: boolean;
}

const COMMON_SUBJECTS = [
  'Matemáticas',
  'Física',
  'Química',
  'Biología',
  'Historia',
  'Geografía',
  'Lengua y Literatura',
  'Inglés',
  'Educación Física',
  'Arte',
  'Música',
  'Informática',
  'Filosofía',
  'Economía',
];

export const SubjectModal: React.FC<SubjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  subject,
  courseName,
  isLoading,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (subject) {
      setFormData({
        name: subject.name,
        code: subject.code,
        description: subject.description,
      });
    } else {
      setFormData({
        name: '',
        code: '',
        description: '',
      });
    }
    setError(null);
  }, [subject, isOpen]);

  // Auto-generate code when name changes
  const generateCode = (name: string) => {
    const words = name.split(' ');
    const prefix = words.map(w => w[0]?.toUpperCase() || '').join('').substring(0, 3);
    const random = Math.floor(Math.random() * 900) + 100;
    return `${prefix}-${random}`;
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      code: prev.code || generateCode(name),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name || !formData.code) {
      setError('Nombre y código son requeridos');
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
          <div>
            <h2 className="text-xl font-semibold text-white">
              {subject ? 'Editar Materia' : 'Nueva Materia'}
            </h2>
            <p className="text-gray-400 text-sm">Curso: {courseName}</p>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Quick Select */}
          {!subject && (
            <div>
              <label className="block text-gray-400 text-sm mb-2">Selección Rápida</label>
              <div className="flex flex-wrap gap-2">
                {COMMON_SUBJECTS.slice(0, 8).map((subj) => (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => handleNameChange(subj)}
                    className={`px-3 py-1 rounded-full text-xs transition-colors ${
                      formData.name === subj
                        ? 'bg-purple-500 text-white'
                        : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                    }`}
                  >
                    {subj}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">Nombre de la Materia *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Ej: Matemáticas"
              list="subjects-list"
            />
            <datalist id="subjects-list">
              {COMMON_SUBJECTS.map((subj) => (
                <option key={subj} value={subj} />
              ))}
            </datalist>
          </div>

          {/* Code */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">Código *</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Ej: MAT-301"
            />
            <p className="text-gray-500 text-xs mt-1">Se genera automáticamente, pero puedes editarlo</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">Descripción</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder="Descripción opcional de la materia..."
              rows={3}
            />
          </div>

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

export default SubjectModal;
