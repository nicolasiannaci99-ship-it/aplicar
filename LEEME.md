# Funnel VSL · MyConsulting.io

- `index.html` → Landing con el VSL + Calendly
- `gracias/index.html` → Página post-agenda (tu-dominio.com/gracias/)
- `assets/config.js` → **lo único que hay que editar**: Pixel de Meta, WhatsApp, Calendly, videos, casos y testimonios

## Flujo
1. Anuncio → landing (con `?utm_source=...`). Los UTMs se guardan y viajan a Calendly y al WhatsApp.
2. Agenda en Calendly → redirige a `/gracias/` con nombre y fecha.
3. En `/gracias/` se dispara el evento **Schedule** del Pixel. Los clics en WhatsApp disparan **Contact**.

## Calendly (una sola vez)
Evento "Llamada estratégica" → Opciones de la página de reserva → **Redirigir a un sitio externo** →
`https://TU-DOMINIO/gracias/` y tildar **Pasar detalles del evento a la página de redirección**.

## Publicar con GitHub Pages
1. Subir esta carpeta a un repo de GitHub.
2. Repo → Settings → Pages → Source: *Deploy from a branch* → `main` / root.
3. Settings → Pages → Custom domain: `tu-dominio.com` (crea el archivo CNAME solo). Tildar *Enforce HTTPS*.
4. En el proveedor del dominio (DNS):
   - Dominio raíz: 4 registros **A** → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `www`: registro **CNAME** → `TU-USUARIO.github.io`
