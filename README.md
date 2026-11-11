# Voluntariados de Navidad · Recoletos

Web para que los estudiantes de Recoletos vean los voluntariados de la campaña de Navidad, cuántas plazas quedan y se apunten con su cuenta de Google. Incluye un panel (`/admin`) para crear, editar, ocultar y eliminar voluntariados, ver a los apuntados, avisarles por email de cambios y exportarlos a Excel.

- Producción: https://voluntariado-recoletos.vercel.app
- Stack: Astro (modo servidor) en Vercel, Postgres en Neon, login con Google, emails por Gmail.

## Desarrollo local

Necesitas Node 22+, pnpm y Docker.

```bash
pnpm install
pnpm db:up            # Postgres local en el puerto 54329
cp .env.example .env  # y rellena los valores (ver abajo)
pnpm db:migrate       # crea las tablas y el primer admin
pnpm dev              # http://localhost:4321
pnpm test             # usa su propia base de datos (reco_test)
```

## Variables de entorno

| Variable | Qué es |
| --- | --- |
| `DATABASE_URL` | Conexión a Postgres. En Vercel la pone la integración de Neon. |
| `SITE_URL` | URL pública sin barra final (`http://localhost:4321` en local). |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Cliente OAuth de Google (ver abajo). |
| `GMAIL_USER` | `recoletosuniversitario@gmail.com` |
| `GMAIL_APP_PASSWORD` | Contraseña de aplicación de esa cuenta (ver abajo). |
| `INITIAL_ADMIN_EMAIL` | Email de Google del primer admin. `pnpm db:migrate` lo da de alta. |

## Pasos manuales

1. **Google OAuth.** En Google Cloud Console → Google Auth Platform: pantalla de consentimiento *Externa* y publicada (*En producción*), sin logo para no necesitar verificación. Crea un cliente de tipo *Aplicación web* con estas URIs de redirección:
   - `http://localhost:4321/login/google/callback`
   - `https://voluntariado-recoletos.vercel.app/login/google/callback`
2. **Gmail.** Con la verificación en dos pasos activa en `recoletosuniversitario@gmail.com`, crea una contraseña en https://myaccount.google.com/apppasswords. Google puede tardar unos días en permitirlo si la verificación en dos pasos es reciente.
3. **Neon.** Ya está conectado al proyecto de Vercel (`voluntariado-recoletos-db`, Frankfurt). Para aplicar el esquema en producción:
   ```bash
   vercel env pull .env.production.local --environment production
   DATABASE_URL="<la de ese fichero>" INITIAL_ADMIN_EMAIL="tu@email" node scripts/migrate.mjs
   rm .env.production.local
   ```
4. **Variables en Vercel.** `vercel env add NOMBRE production` para cada variable de la tabla.
5. **Desplegar.** `vercel --prod`.

Mientras falte `GMAIL_APP_PASSWORD`, todo funciona salvo los emails: las inscripciones y los cambios se guardan, en la tabla de apuntados aparece "sin email de confirmación" y el panel avisa de los envíos que fallan.

## Textos que puedes cambiar

- Emails: la constante `COPY` en `src/lib/emails.ts`.
- Texto de consentimiento (RGPD) y mensajes al apuntarse: `CONSENT_TEXT` y `SIGNUP_MESSAGES` en `src/lib/signup-flow.ts`.
- Portada: `src/components/Hero.astro` y `src/components/SiteFooter.astro`.

## Añadir un campo al formulario de voluntarios

1. Columna nueva en `profiles` en `db/schema.sql` (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`) y `pnpm db:migrate`.
2. Validación en `parseProfileForm` (`src/lib/rules.ts`) y su test en `tests/rules.test.ts`.
3. Guardado y lectura en `src/lib/profiles.ts` y `src/lib/signups.ts`.
4. El campo en `src/components/ProfileForm.astro`.
5. La columna en el Excel (`src/lib/export.ts`) y en la tabla de apuntados del panel.

## Al terminar la campaña

Entra en `/admin/borrar-datos` y borra los datos de los voluntarios. Se conservan los voluntariados y los admins.
