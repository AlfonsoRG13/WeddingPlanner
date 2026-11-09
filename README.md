# Nuestro día

Organizador local de boda, creado con React y TypeScript. La sección inicial permite administrar invitados, sus acompañantes, asistencia, invitaciones simbólicas y si son niños.

## Requisitos

- Node.js 20.19+ o 22.12+
- npm

## Iniciar en desarrollo

```sh
npm install
npm run dev
```

Abre la dirección que aparece en la terminal (por defecto `http://127.0.0.1:5173`). La aplicación y el servicio local se ejecutan juntos.

En PowerShell, si la política de ejecución bloquea `npm`, usa `npm.cmd` en lugar de `npm` para ejecutar estos comandos.

En Windows también puedes hacer doble clic en `Iniciar.bat`. El archivo inicia el servidor en una ventana de consola y abre la aplicación en el navegador cuando esté lista. Si faltan las dependencias, las instala primero.

## Crear y ejecutar la versión de producción

```sh
npm run build
npm start
```

La versión de producción queda disponible en `http://127.0.0.1:4173`.

Los invitados se guardan en `data/guests.json` en la computadora donde se ejecuta el servidor. El servidor escucha únicamente en la interfaz local. Haz una copia de ese archivo para respaldar la lista; no se incluye en Git para evitar publicar datos personales.
