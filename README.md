# Nuestro día

Organizador de boda creado con React, TypeScript y Node.js. Administra invitados, acompañantes, confirmaciones, gastos y pagos. Puede ejecutarse localmente con archivos JSON o publicarse como una aplicación web privada con PostgreSQL.

## Desarrollo local

Requisitos: Node.js 20.19+ o 22.12+ y npm.

```powershell
npm.cmd install
npm.cmd run dev
```

Abre `http://127.0.0.1:5173`. En Windows también puedes usar `Iniciar.bat`. En modo local, la aplicación lee y escribe `data/guests.json` y `data/expenses.json`.

## Publicar gratis con Render y Supabase

El repositorio público contiene el código, pero no los datos de invitados ni gastos. Los archivos reales permanecen excluidos de Git; en la versión publicada los datos viven en PostgreSQL. La app requiere un usuario y contraseña compartidos antes de mostrar o modificar información. GitHub Pages por sí solo no puede ejecutar el servidor ni guardar cambios en una base de datos.

1. Crea una base de datos PostgreSQL en el plan gratuito de Supabase.
2. En los ajustes de conexión de Supabase, elige la **Transaction pooler** y copia la URI de PostgreSQL. Conserva la URL en un gestor seguro. Para verificar también el certificado TLS del servidor, descarga el certificado raíz de la base en Supabase.
3. En Render, crea un **Blueprint** y conecta este repositorio. Render leerá [`render.yaml`](./render.yaml) para crear un servicio web en el plan gratuito; no crea ni cobra una base de datos.
4. Cuando Render solicite variables, configura `DATABASE_URL` con la URI del pooler de Supabase, `APP_USERNAME` y una contraseña única de al menos 16 caracteres para `APP_PASSWORD`. Deja `DATABASE_SSL=true`; Render genera automáticamente `APP_SESSION_SECRET`. Opcionalmente, configura `DATABASE_CA_CERT` con el contenido del certificado raíz descargado de Supabase para validar el certificado del servidor además de cifrar la conexión.
5. Cuando termine el despliegue, Render proporcionará una URL pública `onrender.com`. La aplicación estará detrás del inicio de sesión.
6. Para copiar los datos existentes del equipo a PostgreSQL, sigue **Migrar los datos locales** en [docs/technical.md](./docs/technical.md). Usa la misma URL externa de conexión en `DATABASE_URL`. La migración es manual y se detiene si la base ya contiene datos.

**Límites importantes del plan gratuito:** Render suspende el servidor tras 15 minutos sin actividad, así que la primera visita puede tardar cerca de un minuto; dispone de 750 horas gratuitas al mes por workspace. Supabase puede pausar la base después de una semana de inactividad y limita el almacenamiento de base de datos a 500 MB. En el plan gratuito de Supabase no hay respaldos automáticos diarios; conserva copias privadas de los datos y verifica las políticas vigentes de ambos proveedores. Esta opción es adecuada para probar o para un proyecto personal de poco uso, pero no ofrece disponibilidad garantizada.

## Ejecutar en producción local

La ejecución de producción requiere `DATABASE_URL`, `APP_USERNAME`, `APP_PASSWORD` y `APP_SESSION_SECRET`. Configura estos valores como variables de entorno y luego ejecuta:

```powershell
npm.cmd run build
npm.cmd start
```

Consulta [.env.example](./.env.example) para ver los nombres de las variables. No guardes valores secretos en ese archivo ni en Git.

## Documentación

La arquitectura, la autenticación, los modelos, la persistencia, la migración y el despliegue están descritos en [docs/technical.md](./docs/technical.md).
