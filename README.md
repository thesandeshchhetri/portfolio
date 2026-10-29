# Portfolio (Next.js + MySQL + Prisma)

A personal portfolio for projects, experience, and rides, with an admin area.

## Setup
1. Copy `.env.example` to `.env` and replace every placeholder with unique, strong secrets. Generate `SESSION_SECRET` using `openssl rand -base64 48`.
2. Run `docker compose up --build -d`.
3. Visit `http://localhost:3000` and `http://localhost:3000/admin`.
4. Set `SEED_DATABASE=true` for the first start only if you want sample records, then set it back to `false`.

Keep `.env`, production credentials, database dumps and private uploads out of Git. Put the site behind HTTPS before exposing it publicly.

## Security changes
- Removed the default `changeme` admin password; login returns an error until `ADMIN_PASSWORD` (12+ characters) and `SESSION_SECRET` (32+ characters) are configured.
- Admin cookies are HMAC-signed, HttpOnly, expire after eight hours, and use SameSite=Strict plus Secure in production.
- Login has in-process rate limiting. For multiple app instances, use shared rate limiting or configure it at the reverse proxy.
- Mutating requests require a same-origin Origin header.
- Image uploads validate JPEG/PNG/WebP signatures, limit files to 5 MB, and use random filenames.
- Production Docker build uses `next build`/`next start` and runs as a non-root user; DB credentials are configured through environment variables.

## Notes
Uploaded photos are stored in `uploads/`. Add the optional hero photo at `public/photos/r15.jpg`. Edit social links in `src/template.html`.

For production schema evolution, prefer reviewed Prisma migrations and database backups over automatic schema changes. The Compose startup currently applies `prisma db push` for easy initial setup.
