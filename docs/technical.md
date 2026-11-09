# Documentación técnica

Este documento describe la arquitectura y el comportamiento implementado. Debe actualizarse cuando se agreguen o cambien funciones, datos, endpoints, comandos o decisiones técnicas del proyecto.

## Alcance actual

La aplicación es un organizador de boda local. Las secciones implementadas administran invitados y gastos; otras secciones, como mesas y fotos, quedan para futuras ampliaciones.

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
- Un archivo JSON local como almacenamiento persistente.

No se requiere una base de datos ni un servicio externo. El aspecto visual utiliza fuentes del sistema para funcionar sin solicitar fuentes a Internet.

## Estructura del proyecto

```text
.
├── data/
│   ├── guests.json       # Datos locales; excluido de Git
│   └── expenses.json     # Gastos y pagos locales; excluido de Git
├── docs/
│   └── technical.md      # Esta documentación
├── src/
│   ├── App.tsx           # Interfaz, estado y operaciones de invitados
│   ├── ExpensesSection.tsx # Interfaz y operaciones de conceptos y pagos
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

`data/expenses.json` contiene un arreglo de conceptos. Cada concepto incluye:

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

El servidor carga el archivo al iniciar y conserva la lista en memoria durante su ejecución. Al iniciar, si encuentra `firstName` y `lastName`, combina sus valores en `name` y guarda el formato actualizado. Cada alta, edición o eliminación escribe la lista completa en un archivo temporal y luego lo renombra sobre `guests.json`, reduciendo la posibilidad de dejar un archivo parcialmente escrito.

Si los archivos todavía no existen, el servidor crea `data/guests.json` y `data/expenses.json` con listas vacías. Al cargar registros antiguos de invitados, completa los campos incorporados posteriormente (`symbolicInvitation`, `isChild` y `weddingRole`) con `false`, `false` y `none`, respectivamente.

Los datos son locales a la computadora y al directorio del proyecto. No se sincronizan entre dispositivos. Para respaldarlos, copia `data/guests.json` y `data/expenses.json` con el servidor detenido. Ambos archivos están excluidos de Git porque pueden contener información personal.

## API local

El cliente y el servidor se comunican mediante JSON:

| Método | Ruta | Comportamiento |
|---|---|---|
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
