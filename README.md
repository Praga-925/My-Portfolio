# Pragatishvar Cybersecurity Portfolio

Production-ready modular portfolio with dynamic content, admin CRUD, and backend-powered contact form.

## Stack
- Frontend: HTML, CSS, Vanilla JavaScript (ES modules)
- Backend: Node.js + Express
- Data: JSON files in `data/`
- Mail: Nodemailer via SMTP

## Project Structure
- `index.html` - main public entry
- `css/style.css` - full styling
- `js/main.js` - frontend bootstrap
- `js/modules/` - feature modules
- `data/projects.json` - dynamic project data
- `data/certificates.json` - dynamic certificate data
- `admin/` - authenticated content manager
- `server.js` - API + static serving
- `content/blog/` - future blog content
- `content/ctf-writeups/` - future CTF content

## Setup
1. Install dependencies:
   - `npm install`
2. Configure environment:
   - Copy `.env.example` to `.env`
   - Fill SMTP and admin credentials
3. Run development server:
   - `npm run dev`
4. Open:
   - Portfolio: `http://localhost:3000`
   - Admin: `http://localhost:3000/admin`

## API Overview
- `GET /api/projects`
- `GET /api/certificates`
- `POST /api/contact`
- `POST /api/admin/login`
- `GET /api/admin/me`
- `POST/PUT/DELETE /api/projects`
- `POST/PUT/DELETE /api/certificates`

## Notes
- External links use `rel="noopener noreferrer"`.
- Contact API enforces validation and rate limits.
- Admin-protected CRUD endpoints require bearer token.
