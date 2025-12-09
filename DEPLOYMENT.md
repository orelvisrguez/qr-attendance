# Guia de Despliegue - QR Attendance System

## Requisitos Previos

1. Cuenta en [GitHub](https://github.com)
2. Cuenta en [Vercel](https://vercel.com)
3. Cuenta en [Supabase](https://supabase.com)

---

## Paso 1: Configurar Supabase

### 1.1 Crear Proyecto
1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Configura nombre, password y region
4. Espera a que el proyecto se cree

### 1.2 Obtener Credenciales
Ve a **Settings > API** y copia:
- `Project URL` → `VITE_SUPABASE_URL`
- `anon public` key → `VITE_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### 1.3 Configurar Base de Datos (Opcional)
Ve a **Settings > Database** y copia:
- `Connection string (Transaction)` → `DATABASE_URL`
- `Connection string (Session)` → `DIRECT_URL`

---

## Paso 2: Subir a GitHub

```bash
# En el directorio del proyecto
git init
git add .
git commit -m "Initial commit: QR Attendance System"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/qr-attendance.git
git push -u origin main
```

---

## Paso 3: Desplegar en Vercel

### 3.1 Importar Proyecto
1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" > "Project"
3. Importa tu repositorio de GitHub
4. Selecciona "qr-attendance"

### 3.2 Configurar Variables de Entorno
En la seccion "Environment Variables", agrega:

| Variable | Valor |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://[PROJECT-REF].supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Tu anon key de Supabase |
| `SUPABASE_URL` | `https://[PROJECT-REF].supabase.co` |
| `SUPABASE_ANON_KEY` | Tu anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Tu service role key |
| `JWT_SECRET` | Una cadena aleatoria de 32+ caracteres |
| `QR_ENCRYPTION_KEY` | Exactamente 32 caracteres |

### 3.3 Configuracion de Build
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 3.4 Deploy
Click "Deploy" y espera a que termine.

---

## Paso 4: Verificar Despliegue

1. Abre la URL proporcionada por Vercel
2. Prueba el login con credenciales demo:
   - Admin: `admin@demo.com` / `demo123`
   - Profesor: `profesor@demo.com` / `demo123`
   - Alumno: `alumno@demo.com` / `demo123`

---

## Arquitectura en Produccion

```
[Browser]
    |
    +---> [Vercel Edge] ---> [Static Files (React)]
    |
    +---> [/api/*] ---> [Vercel Serverless Functions]
    |
    +---> [Supabase Realtime] <---> [QR Broadcasting]
    |
    +---> [Supabase Database] ---> [PostgreSQL]
```

### Flujo del QR en Tiempo Real
1. Profesor inicia sesion de asistencia
2. QRProjector genera QR y lo transmite via Supabase Realtime
3. Alumno escanea QR con QRScanner
4. QRScanner valida y envia asistencia via Supabase Realtime
5. QRProjector recibe confirmacion y actualiza lista

---

## Comandos Utiles

```bash
# Desarrollo local
npm run dev          # Solo frontend
npm run dev:server   # Solo backend Express
npm run dev:all      # Frontend + Backend

# Build
npm run build        # Build para produccion

# Base de datos (cuando uses Prisma)
npm run db:generate  # Generar cliente Prisma
npm run db:push      # Sincronizar schema
npm run db:migrate   # Ejecutar migraciones
npm run db:studio    # Abrir Prisma Studio
```

---

## Troubleshooting

### Error: Supabase Realtime no conecta
- Verifica que `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` esten configurados
- Revisa la consola del navegador para errores

### Error: API 404
- Verifica que los archivos en `/api/` existan
- Revisa que `vercel.json` tenga los rewrites correctos

### Error: CORS
- Los headers CORS ya estan configurados en cada funcion
- Si usas dominio custom, actualiza los headers

---

## Proximos Pasos

1. **Configurar Tablas en Supabase**: Crear esquema de BD
2. **Habilitar Autenticacion Real**: Usar Supabase Auth
3. **Agregar RLS**: Row Level Security para datos
4. **Configurar Dominio Custom**: En Vercel y Supabase
