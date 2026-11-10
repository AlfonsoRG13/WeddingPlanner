# Documentación técnica

Este documento describe la arquitectura y el comportamiento implementado. Debe actualizarse cuando se agreguen o cambien funciones, datos, endpoints, comandos o decisiones técnicas del proyecto.

## Alcance actual

La aplicación administra invitados y gastos. Puede ejecutarse localmente con archivos JSON o publicarse como una aplicación web autenticada con PostgreSQL; otras secciones, como mesas y fotos, quedan para futuras ampliaciones.

La interfaz permite:

- Agregar, editar y eliminar invitados.
- Buscar por nombre, apellidos, persona que invitó y nombre del acompañante.
- Filtrar por todos, confirmados, pendientes, invitaciones simbólicas y por rol especial (Best man o Bridesmaid).
- Ver el total de invitados asistentes, las invitaciones simbólicas, los niños, las confirmaciones y la cantidad de invitados con acompañante. El total excluye a quienes tienen `symbolicInvitation` o `isChild`; también excluye sus acompañantes. A los demás registros se les suma un acompañante cuando `hasPlusOne` es `true`.
- Marcar a una persona como niño/a y registrar invitaciones simbólicas.
- Asignar un rol de boda: ninguno, Best man o Bridesmaid.
- Administrar conceptos de gastos, encargados y teléfonos de contacto.
- Buscar gastos por concepto, encargado, teléfono o nota del pago; los conceptos se muestran plegados y se expanden individualmente para consultar pagos y detalles.
- Calcular conceptos por persona usando la cantidad de registros de invitados; el total se actualiza al cambiar la lista.
- Registrar y eliminar pagos, y consultar el costo total de la boda, el acumulado pagado y el saldo pendiente.

## Tecnologías

- React y TypeScript para la interfaz.
- Vite para el desarrollo y la compilación del cliente.
- Node.js, módulos ES y el módulo HTTP nativo para el servidor local y la API.
- Archivos JSON para persistencia local y PostgreSQL (JSONB) para el despliegue administrado.
- Render Blueprint para aprovisionar el servicio web gratuito; PostgreSQL gratuito se crea por separado en Supabase.
- Sesiones firmadas en cookie `HttpOnly`, con autenticación compartida configurada por variables de entorno.

El aspecto visual utiliza fuentes del sistema para funcionar sin solicitar fuentes a Internet.

## Estructura del proyecto

```text
.
├── data/
│   ├── guests.json       # Datos locales; excluido de Git
│   └── expenses.json     # Gastos y pagos locales; excluido de Git
├── docs/
│   └── technical.md      # Esta documentación
├── src/
│   ├── components/layout/ # Encabezado, bienvenida y pie reutilizables
│   ├── features/
│   │   ├── auth/        # Formulario de inicio de sesión
│   │   ├── guests/       # Sección de invitados, tipos, opciones y componentes
│   │   └── expenses/     # Sección de gastos, tipos, cálculos y componentes
│   ├── shared/
│   │   ├── api.ts        # Cliente HTTP, normalización de búsqueda y errores
│   │   └── components/   # Modal y mensajes reutilizables
│   ├── App.tsx           # Composición de la app y carga compartida de invitados
│   ├── main.tsx          # Entrada de React
│   └── styles.css        # Estilos adaptables
├── Iniciar.bat           # Lanzador para Windows
├── scripts/
│   └── migrate-json-to-postgres.mjs # Importación única de datos locales
├── server.mjs            # API, autenticación, persistencia y servidor web
├── render.yaml           # Configuración de despliegue gratuito del servidor en Render
├── vite.config.ts        # Configuración de Vite
├── index.html            # Documento HTML de entrada
└── package.json          # Dependencias y comandos npm
```

## Modelo de datos

Localmente, `data/guests.json` contiene un arreglo de objetos; cada invitado tiene esta forma. En PostgreSQL, el arreglo se guarda en la columna `guests` de `wedding_data`:

```json
{
  "id": "UUID generado por el servidor",
  "name": "Nombre completo",
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
| `name` | Cadena obligatoria con el nombre completo del invitado |
| `invitedBy`, `plusOneName` | Cadenas |
| `hasPlusOne`, `confirmed`, `symbolicInvitation`, `isChild` | Booleanos |
| `gender` | `female`, `male`, `other`, `undisclosed` |
| `weddingRole` | `none`, `bestMan`, `bridesmaid` |

Una invitación simbólica se registra sin asistencia: al guardar, `confirmed` queda en `false`. Si no hay acompañante, el nombre se guarda como una cadena vacía.

### Modelo de gastos

Localmente, `data/expenses.json` contiene un arreglo de conceptos; en PostgreSQL se guarda en la columna `expenses` de `wedding_data`. Cada concepto incluye:

```json
{
  "id": "UUID generado por el servidor",
  "concept": "Banquete",
  "responsible": "Proveedor o encargado",
  "phone": "Teléfono de contacto",
  "pricePerPerson": 1250,
  "fixedAmount": 0,
  "payments": [
    {
      "id": "UUID generado por el servidor",
      "amount": 5000,
      "date": "2026-11-09",
      "note": "Anticipo"
    }
  ]
}
```

`responsible` y `phone` pueden quedar vacíos. `pricePerPerson` es `null` cuando el precio por persona no aplica; en ese caso `fixedAmount` guarda el total capturado manualmente. Cuando hay precio por persona, el total se calcula como `pricePerPerson × cantidad de registros de invitados` y `fixedAmount` se guarda como cero. Cada registro de invitado cuenta una vez, incluso si tiene acompañante, está pendiente o tiene invitación simbólica. El importe calculado se actualiza al cambiar la lista de invitados. Los importes se presentan en pesos mexicanos (MXN).

Los pagos tienen un importe positivo, fecha ISO `AAAA-MM-DD` y nota opcional. El total pagado de un concepto es la suma de sus pagos; el pendiente es `max(total del concepto − pagos, 0)`. Si se modifica el número de invitados y el concepto queda pagado por encima del total recalculado, la diferencia se muestra como “Pagado de más”. Los totales globales suman todos los conceptos y pagos.

### Persistencia y compatibilidad

En desarrollo local, el servidor carga los JSON al iniciar y conserva las listas en memoria. Al iniciar, si encuentra `firstName` y `lastName`, combina sus valores en `name` y guarda el formato actualizado. Cada alta, edición o eliminación escribe un archivo temporal y luego lo renombra sobre el JSON original.

Cuando `DATABASE_URL` está configurada, el servidor crea la tabla `wedding_data` si hace falta y guarda los dos arreglos como JSONB. Para el despliegue gratuito, Render ejecuta una única instancia web gratuita y Supabase aloja PostgreSQL en su plan Free; el Blueprint no crea una base de datos de Render. Las llamadas a la API se serializan dentro del proceso. En producción, el servidor exige tanto PostgreSQL como los secretos de autenticación; no cae silenciosamente a archivos locales.

Al iniciar registros JSON antiguos, se completan los campos incorporados posteriormente (`symbolicInvitation`, `isChild` y `weddingRole`) con `false`, `false` y `none`. `data/guests.json`, `data/expenses.json` y los archivos `.env` se excluyen de Git: el código puede estar en un repositorio público, pero no se deben publicar los datos reales ni credenciales.

#### Despliegue gratuito y migración de los JSON a Supabase PostgreSQL

La migración importa ambos archivos de manera transaccional y solo cuando las dos listas de la base están vacías. No se ejecuta automáticamente al desplegar y no sobrescribe datos existentes.

1. Crea un proyecto Supabase en el plan gratuito y espera a que PostgreSQL esté listo.
2. En Supabase, abre la información de conexión y copia la URI de PostgreSQL del **Transaction pooler** para conexiones IPv4. No la publiques ni la guardes en el repositorio.
3. En Render, conecta el repositorio y crea un Blueprint desde `render.yaml`. El Blueprint configura solamente el servidor web gratuito.
4. En Render, configura `DATABASE_URL` con la URI del pooler de Supabase, `DATABASE_SSL=true`, `APP_USERNAME` y `APP_PASSWORD` (mínimo 16 caracteres). Render genera `APP_SESSION_SECRET` automáticamente.
5. Espera a que termine el despliegue. En PowerShell, desde la raíz de tu copia local del proyecto, configura la URL de conexión de Supabase y ejecuta:

   ```powershell
   $env:DATABASE_URL = Read-Host "Pega la URI del Transaction pooler de Supabase"
   $env:DATABASE_SSL = "true"
   npm.cmd run migrate:json
   Remove-Item Env:DATABASE_URL
   Remove-Item Env:DATABASE_SSL
   ```

6. Comprueba en el sitio que aparezcan invitados y gastos. Conserva los JSON locales como respaldo protegido y exporta periódicamente la información: el plan gratuito de Supabase no incluye respaldos automáticos diarios.

El comando `npm.cmd run migrate:json` requiere que los dos archivos locales estén presentes. Si la base ya contiene invitados o gastos, detiene la migración sin reemplazarlos. En el ejemplo de PowerShell, la URL procede de Supabase, no de Render.

El alojamiento gratuito tiene limitaciones de disponibilidad: Render suspende el servidor tras 15 minutos sin solicitudes y la primera petición puede tardar cerca de un minuto en reactivarlo; el plan proporciona 750 horas gratuitas por workspace y mes. Render también puede suspender servicios gratuitos por volúmenes inusualmente altos de tráfico saliente a servicios externos. Supabase Free ofrece 500 MB de base de datos y puede pausar proyectos tras una semana sin actividad. El proyecto puede reanudarse desde Supabase. El plan gratuito de Supabase no ofrece respaldos automáticos diarios. Los límites y condiciones pueden cambiar; verifica los [límites de Render](https://render.com/docs/free) y los [precios de Supabase](https://supabase.com/pricing) antes del despliegue.

## API local

El cliente y el servidor se comunican mediante JSON:

| Método | Ruta | Comportamiento |
|---|---|---|
| `GET` | `/api/health` | Health check público sin datos personales |
| `GET` | `/api/auth/session` | Informa si la sesión está autenticada |
| `POST` | `/api/auth/login` | Valida usuario/contraseña y crea una cookie de sesión |
| `POST` | `/api/auth/logout` | Elimina la cookie de sesión |
| `GET` | `/api/guests` | Devuelve la lista completa |
| `POST` | `/api/guests` | Valida y agrega un invitado; responde `201` |
| `PUT` | `/api/guests/:id` | Valida y reemplaza los datos del invitado |
| `DELETE` | `/api/guests/:id` | Elimina el invitado; responde `204` |
| `GET` | `/api/expenses` | Devuelve todos los conceptos y pagos |
| `POST` | `/api/expenses` | Valida y agrega un concepto sin pagos |
| `PUT` | `/api/expenses/:id` | Actualiza los datos del concepto y conserva sus pagos |
| `DELETE` | `/api/expenses/:id` | Elimina el concepto y sus pagos |
| `POST` | `/api/expenses/:id/payments` | Valida y agrega un pago |
| `DELETE` | `/api/expenses/:id/payments/:paymentId` | Elimina un pago existente |

Todas las rutas de datos requieren sesión válida cuando se activa la autenticación. Las cookies son `HttpOnly`, `SameSite=Strict`, y en producción `Secure`; las sesiones firmadas expiran en 12 horas. Los intentos fallidos de inicio de sesión se limitan por IP. Las rutas de datos para un identificador inexistente responden `404`; los datos que no cumplen el esquema responden `400`. Los cuerpos de solicitud tienen un máximo de 1 MB.

En desarrollo, el servidor Node integra el middleware de Vite y entrega la aplicación; sin variables de autenticación, la sesión local no requiere login. En producción, sirve los archivos compilados de `dist/`, requiere PostgreSQL y credenciales, y escucha en `0.0.0.0` para el proveedor. En ambos casos sirve también la API.

Variables requeridas en producción:

| Variable | Propósito |
|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL |
| `APP_USERNAME` | Usuario compartido de acceso |
| `APP_PASSWORD` | Contraseña compartida (mínimo 16 caracteres) |
| `APP_SESSION_SECRET` | Clave de firma de sesiones (mínimo 32 caracteres) |

`DATABASE_SSL=true` habilita TLS validado por Node.js para conexiones PostgreSQL externas. Render genera `APP_SESSION_SECRET` automáticamente y solicita el usuario y la contraseña como secretos al crear el Blueprint. Para el alojamiento gratuito propuesto, configura `DATABASE_URL` con el pooler de Supabase.

## Organización del frontend

El frontend está organizado por responsabilidad y dominio:

- `App.tsx` mantiene la carga compartida de invitados, la navegación entre secciones y la composición general.
- `features/auth/` contiene la pantalla de inicio de sesión.
- `components/layout/` contiene piezas de presentación del shell que se reutilizan entre secciones.
- `features/guests/` y `features/expenses/` mantienen su propio flujo, tipos, constantes y componentes de interfaz.
- `features/*/components/` separa formularios, resúmenes, herramientas de búsqueda/listado y tarjetas en componentes React enfocados.
- `shared/api.ts` centraliza las solicitudes JSON, el formato de errores y la normalización de búsquedas sin distinguir acentos.
- `shared/components/` contiene elementos de interfaz compartidos, como el diálogo accesible y la alerta de error.

Opciones del formulario, filtros, valores iniciales, rutas API, mensajes y formatos/cálculos comunes se definen en módulos con nombre descriptivo para evitar repetirlos en varios componentes.

## Ejecución y compilación

Requisitos: Node.js 20.19+ o 22.12+ y npm.

En desarrollo:

```powershell
npm.cmd install
npm.cmd run dev
```

La dirección predeterminada es `http://127.0.0.1:5173`. La autenticación se activa localmente si se definen sus tres variables de entorno; de lo contrario, solo en desarrollo se considera autenticado al visitante local.

El lanzador `Iniciar.bat` ejecuta la instalación si faltan las dependencias, abre el servidor en una ventana de consola separada, espera a que responda la API y abre el sitio en el navegador. También se creó un acceso directo en el Escritorio de la máquina de desarrollo; ese acceso directo de Windows no forma parte del repositorio.

Para compilar y ejecutar en modo de producción:

```powershell
npm.cmd run build
npm.cmd start
```

La ejecución de producción requiere `DATABASE_URL`, `APP_USERNAME`, `APP_PASSWORD` y `APP_SESSION_SECRET`; `PORT` permite elegir el puerto. El despliegue gratuito del servidor se configura en `render.yaml`; la base PostgreSQL se crea en Supabase.

El servidor escucha en `127.0.0.1` en desarrollo y `0.0.0.0` en producción. `npm run preview` es el comando de Vite para previsualizar archivos compilados, pero no sustituye al servidor Node que proporciona API, autenticación y persistencia.

## Actualización de esta documentación

Al añadir una función, actualizar en esta guía las partes afectadas:

1. Alcance y comportamiento visible.
2. Modelo JSON y valores predeterminados, si cambian los datos.
3. API, validación y persistencia, si cambia el servidor.
4. Estructura, comandos o requisitos, si cambia la ejecución del proyecto.
5. Instrucciones de respaldo o privacidad, si cambia dónde o cómo se guardan los datos.

El `README.md` contiene instrucciones breves de inicio y enlaza a este documento como referencia técnica completa.
