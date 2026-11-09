# Documentación técnica

Este documento describe la arquitectura y el comportamiento implementado. Debe actualizarse cuando se agreguen o cambien funciones, datos, endpoints, comandos o decisiones técnicas del proyecto.

## Alcance actual

La aplicación es un organizador de boda local. La sección implementada administra invitados; otras secciones, como mesas, fotos y cotizaciones, quedan para futuras ampliaciones.

La interfaz permite:

- Agregar, editar y eliminar invitados.
- Buscar por nombre, apellidos, persona que invitó y nombre del acompañante.
- Filtrar por todos, confirmados, pendientes e invitaciones simbólicas.
- Ver el total de invitados, confirmaciones y personas con acompañante.
- Marcar a una persona como niño/a y registrar invitaciones simbólicas.
- Asignar un rol de boda: ninguno, Best man o Bridesmaid.

## Tecnologías

- React y TypeScript para la interfaz.
- Vite para el desarrollo y la compilación del cliente.
- Node.js, módulos ES y el módulo HTTP nativo para el servidor local y la API.
- Un archivo JSON local como almacenamiento persistente.

No se requiere una base de datos ni un servicio externo. El aspecto visual utiliza fuentes del sistema para funcionar sin solicitar fuentes a Internet.

## Estructura del proyecto

```text
.
├── data/
│   └── guests.json       # Datos locales; excluido de Git
├── docs/
│   └── technical.md      # Esta documentación
├── src/
│   ├── App.tsx           # Interfaz, estado y operaciones de invitados
│   ├── main.tsx          # Entrada de React
│   └── styles.css        # Estilos adaptables
├── Iniciar.bat           # Lanzador para Windows
├── server.mjs            # API, persistencia y servidor de archivos
├── vite.config.ts        # Configuración de Vite
├── index.html            # Documento HTML de entrada
└── package.json          # Dependencias y comandos npm
```

## Modelo de datos

`data/guests.json` contiene un arreglo de objetos. Cada invitado tiene esta forma:

```json
{
  "id": "UUID generado por el servidor",
  "firstName": "Nombre",
  "lastName": "Apellidos",
  "invitedBy": "Quién lo invitó",
  "hasPlusOne": false,
  "plusOneName": "",
  "confirmed": false,
  "symbolicInvitation": false,
  "isChild": false,
  "gender": "undisclosed",
  "weddingRole": "none"
}
```

Valores permitidos:

| Campo | Tipo / valores |
|---|---|
| `id` | Cadena única creada con `crypto.randomUUID()` |
| `firstName`, `lastName`, `invitedBy`, `plusOneName` | Cadenas; nombre y apellidos son obligatorios |
| `hasPlusOne`, `confirmed`, `symbolicInvitation`, `isChild` | Booleanos |
| `gender` | `female`, `male`, `other`, `undisclosed` |
| `weddingRole` | `none`, `bestMan`, `bridesmaid` |

Una invitación simbólica se registra sin asistencia: al guardar, `confirmed` queda en `false`. Si no hay acompañante, el nombre se guarda como una cadena vacía.

### Persistencia y compatibilidad

El servidor carga el archivo al iniciar y conserva la lista en memoria durante su ejecución. Cada alta, edición o eliminación escribe la lista completa en un archivo temporal y luego lo renombra sobre `guests.json`, reduciendo la posibilidad de dejar un archivo parcialmente escrito.

Si el archivo todavía no existe, el servidor crea `data/guests.json` con una lista vacía. Al cargar registros antiguos, completa los campos incorporados posteriormente (`symbolicInvitation`, `isChild` y `weddingRole`) con `false`, `false` y `none`, respectivamente.

Los datos son locales a la computadora y al directorio del proyecto. No se sincronizan entre dispositivos. Para respaldarlos, copia `data/guests.json` con el servidor detenido. El archivo está excluido de Git porque contiene datos personales.

## API local

El cliente y el servidor se comunican mediante JSON:

| Método | Ruta | Comportamiento |
|---|---|---|
| `GET` | `/api/guests` | Devuelve la lista completa |
| `POST` | `/api/guests` | Valida y agrega un invitado; responde `201` |
| `PUT` | `/api/guests/:id` | Valida y reemplaza los datos del invitado |
| `DELETE` | `/api/guests/:id` | Elimina el invitado; responde `204` |

Las rutas para un identificador inexistente responden `404`; los datos que no cumplen el esquema responden `400`. Los cuerpos de solicitud tienen un máximo de 1 MB.

En desarrollo, el servidor Node integra el middleware de Vite y entrega la aplicación. En producción, sirve los archivos compilados de `dist/`. En ambos casos sirve también la API.

## Ejecución y compilación

Requisitos: Node.js 20.19+ o 22.12+ y npm.

En desarrollo:

```powershell
npm.cmd install
npm.cmd run dev
```

La dirección predeterminada es `http://127.0.0.1:5173`.

El lanzador `Iniciar.bat` ejecuta la instalación si faltan las dependencias, abre el servidor en una ventana de consola separada, espera a que responda la API y abre el sitio en el navegador. También se creó un acceso directo en el Escritorio de la máquina de desarrollo; ese acceso directo de Windows no forma parte del repositorio.

Para compilar y ejecutar en modo de producción:

```powershell
npm.cmd run build
npm.cmd start
```

La versión compilada queda disponible en `http://127.0.0.1:4173`. La variable de entorno `PORT` permite elegir otro puerto.

El servidor escucha en `127.0.0.1`, por lo que la aplicación no se publica en la red local. `npm run preview` es el comando de Vite para previsualizar archivos compilados, pero no sustituye al servidor Node cuando se necesita la API y el guardado JSON.

## Actualización de esta documentación

Al añadir una función, actualizar en esta guía las partes afectadas:

1. Alcance y comportamiento visible.
2. Modelo JSON y valores predeterminados, si cambian los datos.
3. API, validación y persistencia, si cambia el servidor.
4. Estructura, comandos o requisitos, si cambia la ejecución del proyecto.
5. Instrucciones de respaldo o privacidad, si cambia dónde o cómo se guardan los datos.

El `README.md` contiene instrucciones breves de inicio y enlaza a este documento como referencia técnica completa.
