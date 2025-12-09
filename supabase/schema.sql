-- ============================================
-- QR ATTENDANCE SYSTEM - SUPABASE SCHEMA
-- Ejecutar este script en Supabase SQL Editor
-- ============================================

-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('ADMIN', 'PROFESOR', 'ALUMNO');
CREATE TYPE attendance_status AS ENUM ('PRESENTE', 'AUSENTE', 'TARDANZA', 'JUSTIFICADO');
CREATE TYPE session_status AS ENUM ('ACTIVE', 'PAUSED', 'CLOSED');

-- ============================================
-- USERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role user_role DEFAULT 'ALUMNO',
  avatar TEXT,
  is_active BOOLEAN DEFAULT true,
  email_verified TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- COURSES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  grade VARCHAR(50) NOT NULL,
  section VARCHAR(10) NOT NULL,
  year INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(grade, section, year)
);

CREATE INDEX idx_courses_year_active ON courses(year, is_active);

-- ============================================
-- SUBJECTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL,
  description TEXT,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(code, course_id)
);

CREATE INDEX idx_subjects_course ON subjects(course_id);

-- ============================================
-- COURSE-PROFESOR RELATION
-- ============================================

CREATE TABLE IF NOT EXISTS course_profesors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  profesor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, profesor_id)
);

CREATE INDEX idx_course_profesors_profesor ON course_profesors(profesor_id);

-- ============================================
-- COURSE-STUDENT RELATION
-- ============================================

CREATE TABLE IF NOT EXISTS course_students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, student_id)
);

CREATE INDEX idx_course_students_student ON course_students(student_id);

-- ============================================
-- ATTENDANCE SESSIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS attendance_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  profesor_id UUID NOT NULL REFERENCES users(id),
  status session_status DEFAULT 'ACTIVE',
  secret VARCHAR(64) NOT NULL,
  qr_rotation_seconds INTEGER DEFAULT 7,
  token_valid_seconds INTEGER DEFAULT 10,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sessions_course_subject ON attendance_sessions(course_id, subject_id);
CREATE INDEX idx_sessions_profesor_status ON attendance_sessions(profesor_id, status);
CREATE INDEX idx_sessions_started ON attendance_sessions(started_at);

-- ============================================
-- ATTENDANCES TABLE (Registros de asistencia)
-- ============================================

CREATE TABLE IF NOT EXISTS attendances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id),
  status attendance_status DEFAULT 'PRESENTE',
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  device_fingerprint VARCHAR(64),
  ip_address VARCHAR(45),
  user_agent TEXT,
  token_used VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- IMPORTANTE: Un alumno solo puede tener un registro por sesión
  UNIQUE(session_id, student_id)
);

CREATE INDEX idx_attendances_session ON attendances(session_id);
CREATE INDEX idx_attendances_student ON attendances(student_id);
CREATE INDEX idx_attendances_scanned ON attendances(scanned_at);

-- ============================================
-- USED TOKENS TABLE (Anti-replay attack)
-- ============================================

CREATE TABLE IF NOT EXISTS used_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  nonce VARCHAR(64) NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_by UUID NOT NULL,
  -- Un nonce solo puede usarse una vez por sesión
  UNIQUE(session_id, nonce)
);

CREATE INDEX idx_used_tokens_session_nonce ON used_tokens(session_id, nonce);

-- ============================================
-- DEVICE FINGERPRINTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS device_fingerprints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fingerprint VARCHAR(64) NOT NULL,
  device_name VARCHAR(100),
  last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, fingerprint)
);

CREATE INDEX idx_device_fingerprints ON device_fingerprints(fingerprint);

-- ============================================
-- SCHOOL CONFIG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS school_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) DEFAULT 'Mi Escuela',
  allowed_ips TEXT[],
  enforce_ip_check BOOLEAN DEFAULT false,
  late_threshold_minutes INTEGER DEFAULT 15,
  max_devices_per_student INTEGER DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TRIGGERS PARA UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a todas las tablas
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON attendance_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendances_updated_at BEFORE UPDATE ON attendances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DATOS DE EJEMPLO (Demo)
-- ============================================

-- Insertar usuarios de demo (contraseña: demo123)
-- Nota: En producción usar bcrypt, aquí usamos SHA-256 del password "demo123"
INSERT INTO users (id, email, password, first_name, last_name, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'admin@demo.com', 'demo123', 'Carlos', 'Administrador', 'ADMIN'),
  ('22222222-2222-2222-2222-222222222222', 'profesor@demo.com', 'demo123', 'María', 'González', 'PROFESOR'),
  ('33333333-3333-3333-3333-333333333333', 'alumno@demo.com', 'demo123', 'Juan', 'Pérez', 'ALUMNO'),
  ('44444444-4444-4444-4444-444444444444', 'alumno2@demo.com', 'demo123', 'Ana', 'García', 'ALUMNO'),
  ('55555555-5555-5555-5555-555555555555', 'alumno3@demo.com', 'demo123', 'Pedro', 'Martínez', 'ALUMNO')
ON CONFLICT (email) DO NOTHING;

-- Insertar curso de ejemplo
INSERT INTO courses (id, name, grade, section, year) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '3ro A', '3ro Secundaria', 'A', 2024)
ON CONFLICT (grade, section, year) DO NOTHING;

-- Insertar materia de ejemplo
INSERT INTO subjects (id, name, code, course_id) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Matemáticas', 'MAT-301', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
ON CONFLICT (code, course_id) DO NOTHING;

-- Asignar profesor al curso
INSERT INTO course_profesors (course_id, profesor_id) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (course_id, profesor_id) DO NOTHING;

-- Inscribir alumnos al curso
INSERT INTO course_students (course_id, student_id) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555')
ON CONFLICT (course_id, student_id) DO NOTHING;

-- Configuración inicial de la escuela
INSERT INTO school_config (name, late_threshold_minutes, max_devices_per_student) VALUES
  ('Colegio Demo', 15, 2)
ON CONFLICT DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en tablas sensibles
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver su propia información
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

-- Política: Admins pueden ver todo
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'ADMIN'
    )
  );

-- Nota: Para desarrollo, puedes deshabilitar RLS temporalmente:
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE attendances DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE attendance_sessions DISABLE ROW LEVEL SECURITY;

-- ============================================
-- GRANTS PARA SERVICE ROLE
-- ============================================

-- El service_role key tiene acceso completo por defecto en Supabase
-- Estas políticas son para el anon key si lo necesitas

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================

-- Para verificar que todo se creó correctamente:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
