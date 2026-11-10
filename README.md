# Nuestro día

Organizador de boda creado con React, TypeScript y Node.js. Administra invitados, acompañantes, confirmaciones, gastos y pagos. Puede ejecutarse localmente con archivos JSON o publicarse como una aplicación web privada con PostgreSQL.

## Desarrollo local

Requisitos: Node.js 20.19+ o 22.12+ y npm.

```powershell
npm.cmd install
npm.cmd run dev
```

Abre `http://127.0.0.1:5173`. En Windows también puedes usar `Iniciar.bat`. En modo local, la aplicación lee y escribe `data/guests.json` y `data/expenses.json`.

## Publicar en internet con Render

El repositorio público contiene el código, pero no los datos de invitados ni gastos. Los archivos reales permanecen excluidos de Git; en la versión publicada los datos viven en PostgreSQL. La app requiere un usuario y contraseña compartidos antes de mostrar o modificar información. GitHub Pages por sí solo no puede ejecutar el servidor ni guardar cambios en una base de datos.

1. Crea un repositorio público vacío en GitHub y sube el código con Git. Antes de confirmar, comprueba que `data/guests.json` y `data/expenses.json` no estén entre los archivos preparados para commit. No los agregues con `git add -f`.
2. En Render, crea un **Blueprint** y conecta ese repositorio. Render leerá [`render.yaml`](./render.yaml) para crear el servicio web y PostgreSQL.
3. Durante la configuración, define `APP_USERNAME` y una contraseña fuerte de al menos 16 caracteres para `APP_PASSWORD`. `APP_SESSION_SECRET` se genera automáticamente. Guarda la contraseña en un gestor seguro; no la pongas en GitHub.
4. Cuando termine el despliegue, Render proporcionará una URL pública `onrender.com`. La aplicación estará detrás del inicio de sesión.
5. Para copiar los datos existentes del equipo a PostgreSQL, sigue **Migrar los datos locales** en [docs/technical.md](./docs/technical.md). La migración es manual, se ejecuta una sola vez y se conecta a la URL externa de PostgreSQL. No se suben los JSON al repositorio.

El despliegue y la base de datos están sujetos a los planes, límites, disponibilidad y costos vigentes del proveedor. Configura respaldos periódicos en Render y conserva también una copia protegida de tus datos.

## Ejecutar en producción local

La ejecución de producción requiere `DATABASE_URL`, `APP_USERNAME`, `APP_PASSWORD` y `APP_SESSION_SECRET`. Configura estos valores como variables de entorno y luego ejecuta:

```powershell
npm.cmd run build
npm.cmd start
```

Consulta [.env.example](./.env.example) para ver los nombres de las variables. No guardes valores secretos en ese archivo ni en Git.

## Documentación

La arquitectura, la autenticación, los modelos, la persistencia, la migración y el despliegue están descritos en [docs/technical.md](./docs/technical.md).
