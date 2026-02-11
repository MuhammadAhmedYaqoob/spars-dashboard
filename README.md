# SPARS Admin Panel — Full Stack (Next.js 14 + FastAPI + MySQL)

This is a **complete working system** matching your requirements:

- **Frontend**: Next.js 14 (App Router) + Recharts (Dashboard charts)
- **Backend**: FastAPI (Python)
- **Database**: MySQL 8 (with JSON column for dynamic form data)

## Quick Start

### 1) MySQL
Create a MySQL database (or use Docker). Default URL in backend `.env` is:
```
MYSQL_URL=mysql+pymysql://root:password@localhost:3306/spars_db
```
Update credentials as needed.

### 2) Backend (FastAPI)
```
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # and update if needed
uvicorn main:app --reload
```
FastAPI runs at: http://127.0.0.1:8000
Docs: http://127.0.0.1:8000/docs

### 3) Frontend (Next.js)
```
cd frontend
npm install
cp .env.example .env.local  # update NEXT_PUBLIC_API
npm run dev
```
Next.js runs at: http://localhost:3000

---
## Features Implemented
- 📊 Dashboard charts (Recharts): Pipeline, Leads by Source, Submissions over time
- 🔍 Dynamic filters driven by DB `form_fields` per selected form type
- 🗂 Submissions kept even after conversion to lead (marked `Converted`, back-linked to `lead_id`)
- 🧭 Submissions pages per form type: `/submissions/demo`, `/submissions/talk`, `/submissions/general`, `/submissions/product-profile`, `/submissions/brochure`
- 👤 Users & Roles: separate pages and full CRUD endpoints (basic UI in Next.js to create/delete)
- ✉ Newsletter with Activate/Inactive toggle
- 🌐 CORS enabled, environment-based configuration

---
## Notes
- Seed or add your own form field definitions via `/forms/fields` endpoints, or insert rows in `form_fields` table.
- Frontend filters auto-render based on `field_type` (supported: `text`, `select`, `number`, `date`).
- The backend uses a JSON column (`submissions.data`) to store flexible form payloads and supports filter matching.

---
## Optional: Docker Compose (MySQL only)
A sample is provided in `docker` folder for spinning up MySQL quickly.
