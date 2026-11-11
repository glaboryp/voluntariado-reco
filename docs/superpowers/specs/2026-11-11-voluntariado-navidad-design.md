# Voluntariados de Navidad · Recoletos — Diseño

Fecha: 2026-11-11 · Lanzamiento objetivo: esta semana (antes del 2026-11-15)

## Para qué y por qué

Recoletos (centro universitario) organiza una campaña de voluntariados de Navidad. Necesita una web donde los estudiantes vean la oferta, cuántas plazas quedan en cada voluntariado y se apunten a uno o varios. Los organizadores necesitan un panel para gestionar los voluntariados (todavía no saben cuáles ni con qué cupos) y para contactar con la gente apuntada.

El acceso llega por un enlace en grupos de WhatsApp o un QR en un cartel, así que **casi todo el tráfico es móvil** y la gente llega sin ningún contexto previo.

**Éxito:** un estudiante pasa del enlace a tener la plaza confirmada en menos de un minuto. Los organizadores saben en todo momento quién va a cada sitio y cómo localizarle.

## Objetivos

- Lista pública de voluntariados con plazas libres a la vista.
- Apuntarse a uno o varios voluntariados con cuenta de Google y un formulario corto, que solo se rellena la primera vez.
- Que cada voluntario pueda desapuntarse solo, y que la plaza quede libre al momento.
- Panel de administración: crear, editar, ocultar y eliminar voluntariados; ver y quitar apuntados; exportar a Excel; gestionar admins; borrar todos los datos personales al acabar.
- Emails de confirmación al apuntarse y de aviso de cambios o cancelación.

## Fuera de alcance (por ahora)

- Lista de espera. El envío de emails queda montado para poder añadirla más adelante.
- Campos de formulario configurables desde el panel. Si hacen falta campos nuevos, se añaden por código.
- Campo de "observaciones".
- Dominio propio. Se usa la URL `*.vercel.app`.
- Apuntar a otra persona. Cada uno se apunta a sí mismo.
- Turnos o varias fechas dentro de un mismo voluntariado. **Decisión de la usuaria:** cada turno se crea como un voluntariado aparte en la lista, así que el modelo es de una sesión por voluntariado.

## Anti-objetivos (aunque funcione, sería un fracaso si...)

- Se apuntan más personas que el cupo, por ejemplo dos personas cogiendo la última plaza a la vez.
- Los datos personales quedan expuestos: el teléfono de un voluntario se ve en la web pública, o alguien que no es admin entra en `/admin`.
- Pedir contraseña o un registro largo hace que la gente abandone.
- Tiene pinta de plantilla genérica: tiene que parecer de Recoletos.
- Cuesta dinero: todo debe quedarse en capas gratuitas.

## Restricciones (decididas por la usuaria)

- **Alojamiento:** Vercel (gratis), con la URL que da Vercel.
- **Base de datos:** Neon Postgres (capa gratuita, integración nativa con Vercel).
- **Login:** con Google, tanto para voluntarios como para admins.
- **Envío de emails:** desde `recoletosuniversitario@gmail.com` por SMTP de Gmail con contraseña de aplicación (límite de unos 500 al día, de sobra). Se descarta Resend o similares porque exigen dominio propio para enviar a cualquier destinatario. La contraseña va en una variable de entorno; la usuaria la genera antes de lanzar.
- **Framework:** Astro con TypeScript, en modo servidor (`output: 'server'`) y con el adaptador `@astrojs/vercel`. El login de Google se hace con Auth.js (`auth-astro` o equivalente). Los formularios van con Astro Actions o endpoints. Para las partes interactivas, como los pop-ups, sirven islas pequeñas o JS nativo. Lo decide la usuaria.
- **Gestor de paquetes:** pnpm (preferencia global de la usuaria).
- **Volumen:** unas 50 personas como máximo.
- **Datos:** se borran al terminar la campaña.
- **Idioma de la interfaz:** español. **Zona horaria:** Europe/Madrid.
- **Diseño:** usar las skills `impeccable:impeccable` y `design-taste-frontend` para la dirección visual y los estilos, e incluir el logo de Recoletos.

## Experiencia del voluntario

Boceto de referencia del flujo (solo estructura): `.superpowers/brainstorm/*/content/flujo-voluntario.html`.

1. **Portada (`/`):** pública, sin login. Logo, título de la campaña y lista de voluntariados **visibles**. Cada uno muestra título, descripción, fecha y hora (inicio y, si la hay, fin), lugar, barra de ocupación y el texto "Quedan X de Y plazas". Si está lleno, pone "Completo" y el botón queda desactivado. Pasado el **cierre de inscripción** de un voluntariado ya no se admiten inscripciones: el botón se desactiva y muestra "Inscripción cerrada". Si el voluntariado ya ha empezado, se marca como "Finalizado" o se oculta, a criterio del builder.
2. **"Apuntarme":** si no hay sesión, se entra con Google y se vuelve al voluntariado elegido.
3. **Primera vez: formulario de datos.**
   - Nombre y apellidos (obligatorio).
   - Teléfono (obligatorio; validación razonable de teléfono español o internacional).
   - Email: lo da Google, solo se muestra.
   - ¿Eres mayor de edad? Sí/No (obligatorio; dato informativo para los organizadores, no bloquea la inscripción).
   - Casilla RGPD (obligatoria): consiente el tratamiento para organizar el voluntariado e informa de que los datos se borran al terminar la campaña. Texto provisional en código; la usuaria lo cerrará.

   Al enviar se guarda el perfil y se confirma la plaza en el mismo paso.
4. **Siguientes veces:** "Apuntarme" confirma directamente, sin volver a pedir datos.
5. **Mis voluntariados (`/mis-voluntariados`):** lista de las plazas de esa persona, con un botón "Ya no puedo ir" (con confirmación) que libera la plaza. Desde aquí puede editar sus datos (*mi decisión*: para corregir un teléfono mal puesto sin tener que escribir a un admin).
6. **Reglas:** una persona solo puede apuntarse una vez a cada voluntariado. Si un voluntariado se oculta después de que alguien se haya apuntado, esa persona sigue viéndolo en "Mis voluntariados" (*mi decisión*).

## Panel de administración (`/admin`)

- **Acceso:** login con Google y una lista de emails de admin guardada en base de datos. El primer admin se define con una variable de entorno (`INITIAL_ADMIN_EMAIL`). Desde el panel, cualquier admin puede añadir o quitar admins, pero no quitarse a sí mismo (para no dejar el panel sin nadie). Un admin también puede apuntarse como voluntario normal.
- **Voluntariados:**
  - Crear y editar: título, descripción, fecha y hora de inicio, hora de fin (opcional), lugar, cupo y **fecha y hora de cierre de inscripción**. Si no se toca, el cierre es igual al inicio; se puede cambiar a cualquier momento anterior al inicio, pero nunca posterior (validación en el servidor). Es decisión de la usuaria.
  - El cupo no puede bajar por debajo del número de personas ya apuntadas.
  - Ocultar o mostrar: lo oculto desaparece de la portada pero conserva a sus apuntados.
  - Eliminar, con confirmación.
- **Pop-up de aviso por cambios:** al guardar cambios en **fecha/hora o lugar** de un voluntariado **con gente apuntada**:
  - Se pregunta "¿Quieres avisar por email a las N personas apuntadas del cambio?" (texto final por decidir).
  - **"Sí, enviar email":** se guarda y se envía a cada apuntado un email con los datos anteriores y los nuevos.
  - **"No, les aviso yo":** se guarda y se muestra la lista de apuntados (nombre, teléfono, email) para contactarles a mano.
  - Si no hay apuntados, o solo cambian el título, la descripción o el cupo, se guarda sin preguntar.
- **Eliminar un voluntariado con apuntados:** se usa el mismo patrón ("¿Avisamos por email de la cancelación?" con Sí / No, les aviso yo).
- **Apuntados por voluntariado:** tabla con nombre, teléfono, email, mayor de edad (Sí/No) y fecha de inscripción. Un admin puede quitar a alguien. Al hacerlo aparece el pop-up "¿Quieres avisar por email a <nombre> de que se le ha dado de baja?", con dos botones: "Sí, enviar email" y "No, le aviso yo". Es decisión de la usuaria.
- **Exportar a Excel (.xlsx real, para que tildes y eñes se vean bien):**
  - Botón por voluntariado.
  - Botón "Descargar todo": un archivo con una hoja por voluntariado.
  - Columnas: nombre, teléfono, email, mayor de edad y fecha de inscripción.
- **Fin de campaña:** botón "Borrar todos los datos de voluntarios" con doble confirmación (por ejemplo, escribir BORRAR). Borra perfiles e inscripciones. Los voluntariados y los admins se conservan (*mi decisión*: así la estructura sirve para otra campaña).

## Emails

Todos salen de "Recoletos Voluntariado <recoletosuniversitario@gmail.com>". Son HTML sencillo con texto alternativo y llevan el logo y los colores de marca. Los textos son provisionales y quedan en código para que la usuaria los ajuste.

1. **Confirmación al apuntarse:** tono cercano y motivador ("¡Te esperamos!"). Incluye título, fecha, hora, lugar y un enlace a "Mis voluntariados" por si al final no puede ir.
2. **Aviso de cambio:** qué ha cambiado (antes → ahora) y los datos completos actualizados.
3. **Aviso de cancelación:** el voluntariado se cancela y se dan las gracias.
4. **Aviso de baja por un admin:** se informa de que la organización le ha dado de baja en ese voluntariado, con tono amable, y se incluye un enlace a la portada por si quiere apuntarse a otro.

Si falla el envío de un email, la inscripción o el cambio no se deshacen. En el panel se avisa de que algún email no se envió (*mi decisión*). Los avisos dejan montado el camino para la futura lista de espera.

## Marca

- Logos guardados en `docs/brand/`:
  - `isotipo.webp` / `isotipo-small.webp`: la "R" con la casa.
  - `logo-completo.webp`: isotipo + "recoletos" + "-centro universitario-".
  - `logotipo-texto.webp`: solo el texto.
- *Mi decisión:* el isotipo se redibuja en SVG (es una forma geométrica sencilla). El logotipo de texto sale de `logotipo-texto.webp`, que tiene alta resolución (3364px). En los emails el logo va como PNG alojado en la propia web, porque Gmail no muestra bien SVG ni WebP. Si la usuaria aporta originales vectoriales, se sustituyen.
- Colores: se muestrean de los archivos de logo y se pasan a tokens. Valores de partida:
  - Verde turquesa del isotipo: aprox. `#2BB39A`.
  - Petróleo del texto: aprox. `#0B7A85`.

## Lo que se deja al builder

- **Librerías:** dentro del stack fijado, el builder elige si usar ORM o SQL directo, la librería de Excel y la librería SMTP (nodemailer encaja).
- **Garantía de no sobrepasar el cupo:** debe ser atómica en base de datos (transacción con bloqueo o inserción condicional) y llevar un test.
- **Dirección visual completa:** tipografía, composición, tono navideño (si lo hay, sin caer en tópicos) y modo oscuro, siguiendo las skills de diseño indicadas.
- **Estructura de tablas, migraciones y despliegue.** Hay que documentar en el README los pasos manuales:
  - Crear el proyecto en Google Cloud con el OAuth client y la URL de callback de Vercel.
  - Generar la contraseña de aplicación de Gmail.
  - Configurar las variables de entorno.
  - Integrar Neon en Vercel.

## Despliegue y prueba en real

**Decisión de la usuaria:** dará acceso a la CLI de Vercel en esta máquina, y el builder despliega y prueba de principio a fin.

Lo que solo puede aportar la usuaria desde sus cuentas, y que el plan debe pedir en el momento en que haga falta:
- El cliente OAuth de Google: client ID y secret, con la URL de callback de producción.
- La contraseña de aplicación de Gmail de `recoletosuniversitario@gmail.com`.
- La integración de Neon en Vercel, si la CLI no puede crearla.
- El email del primer admin.

La prueba final en producción cubre:
- Login con Google.
- Apuntarse y recibir el email de confirmación.
- Desapuntarse.
- Pop-up de aviso por cambio, con ambos botones.
- Exportar a Excel.
- Borrado total de datos, en un entorno de prueba o antes de abrir la web.
