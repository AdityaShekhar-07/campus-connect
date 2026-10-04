# CampusConnect

> **"Everything happening on campus, in one place."**

CampusConnect is a production-quality campus event discovery and management platform built for modern university ecosystems. It empowers students to discover workshops, competitions, talks, and club activities, while providing organizers with tools to publish events, monitor registrations, enforce seat capacity, and manage participant rosters.

---

## 🚀 Key Highlights & Business Capabilities

### 1. Dual-Role Architecture
- **Student Experience**:
  - Discover events with multi-parameter search, category filtering, date filters, and capacity sorting.
  - One-click event registration with real-time seat availability indicators.
  - Automatic waitlist placement when an event reaches maximum capacity.
  - Personal registration dashboard with active registration IDs (`CC-2026-XXXXX`), upcoming vs. past events, and seat cancellation.
- **Organizer Experience**:
  - Operational dashboard with metrics: Total Events, Published Events, Active Registrations, and Upcoming Events.
  - Full event lifecycle management: Save Draft, Publish, Edit, and Close Event.
  - Complete participant roster view sorted by confirmed attendees first, followed by waitlisted students.
  - Working CSV roster export for check-ins and attendance tracking.

### 2. Transactional Seat Capacity & Waitlist Engine
- **Server-Authoritative Enforcement**: Capacity checks run inside atomic database transactions (`BEGIN IMMEDIATE` / `COMMIT`), preventing race conditions and ensuring confirmed registrations never exceed the configured seat limit.
- **Deterministic FIFO Waitlist Promotion**: When a confirmed participant cancels their registration, the earliest registered waitlisted student (`registered_at ASC`) is automatically promoted to **CONFIRMED** status within the same transaction.
- **Capacity Reduction Guard**: Organizers are strictly forbidden from lowering event capacity below the current count of confirmed registrations.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, React Router 7, Lucide React icons
- **Backend**: Node.js 22, Express, TypeScript (`tsx`)
- **Database**: Relational SQLite with WAL mode and foreign key constraints enabled via Node's native `DatabaseSync` (`node:sqlite`)
- **Authentication**: JWT token-based authentication with bcrypt password hashing
- **State & Communication**: Context API (`AuthContext`, `ToastContext`), RESTful API endpoints

---

## 👥 Demo Accounts (Seeded)

The database comes pre-seeded with realistic campus accounts:

| Role | Email | Password | Name |
| :--- | :--- | :--- | :--- |
| **Student** | `student@campusconnect.demo` | `student123` | Jordan Hayes |
| **Student** | `maya@campusconnect.demo` | `student123` | Maya Patel |
| **Student** | `liam@campusconnect.demo` | `student123` | Liam Johnson |
| **Student** | `elena@campusconnect.demo` | `student123` | Elena Rostova |
| **Student** | `devon@campusconnect.demo` | `student123` | Devon Miller |
| **Organizer** | `organizer@campusconnect.demo` | `organizer123` | Alex Rivera (Campus Events Office) |
| **Organizer** | `club_lead@campusconnect.demo` | `organizer123` | Sarah Chen (Tech Societies) |

> **Pro-Tip for Evaluators**: A **Quick Demo Switcher** is embedded in the top navigation bar. With a single click, you can instantly toggle between Student and Organizer roles without manual typing.

---

## 📋 Database Schema

```sql
-- Users
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('STUDENT', 'ORGANIZER')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Events
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  venue TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK(capacity > 0),
  status TEXT NOT NULL CHECK(status IN ('DRAFT', 'PUBLISHED', 'CLOSED')),
  organizer_id TEXT NOT NULL REFERENCES users(id),
  organizer_name TEXT NOT NULL,
  registration_deadline TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Registrations
CREATE TABLE registrations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('CONFIRMED', 'WAITLISTED', 'CANCELLED')),
  registered_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

---

## 🔌 API Overview

### Authentication
- `POST /api/auth/login` — Authenticate using email and password. Returns JWT token.
- `POST /api/auth/demo-switch` — Fast-switch between demo student and organizer.
- `POST /api/auth/logout` — Invalidate user session.
- `GET /api/auth/me` — Retrieve current authenticated user profile.

### Events
- `GET /api/events` — Discover published and closed events with search, category, date, and availability filters.
- `GET /api/events/:id` — Retrieve full event details, capacity counts, and student registration status.
- `POST /api/events` — Create event draft or published event (Organizer only).
- `PUT /api/events/:id` — Update event details with capacity guard (Organizer only).
- `PATCH /api/events/:id/publish` — Publish a draft event (Organizer only).
- `PATCH /api/events/:id/close` — Close an event to prevent further registrations (Organizer only).

### Registrations
- `POST /api/events/:id/register` — Atomically register or join waitlist (Student only).
- `GET /api/registrations/me` — List student's upcoming and past registrations (Student only).
- `DELETE /api/registrations/:id` — Cancel registration and trigger waitlist promotion (Student only).

### Organizer
- `GET /api/organizer/dashboard` — Get dashboard metrics and recent events (Organizer only).
- `GET /api/organizer/events` — List organizer's managed events (Organizer only).
- `GET /api/events/:id/participants` — List event participants with status (Organizer only).
- `GET /api/events/:id/participants/export` — Download real CSV roster (Organizer only).

---

## 🧪 Testing Critical Business Logic

CampusConnect includes an automated test suite verifying 10 critical business rules:
1. Student registers and receives `CONFIRMED` when seats are available.
2. Student becomes `WAITLISTED` when capacity is reached.
3. Duplicate active registration is detected and rejected.
4. Closed event rejects new registrations.
5. Draft event rejects public registration and discovery.
6. Cancelling a confirmed registration deterministically promotes the earliest waitlisted student (FIFO).
7. Organizer cannot modify another organizer's event.
8. Student cannot access organizer management endpoints.
9. Capacity cannot be reduced below confirmed registrations count.
10. Invalid event parameters (e.g. zero capacity or missing title) are rejected.

To run the business logic test suite:
```bash
npm test
```

---

## 💻 Setup & Development

### 1. Installation
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Server listen port | `3000` |
| `JWT_SECRET` | Secret key for JWT signing | `campusconnect_jwt_secret_demo_2026_dev_key` |
| `DATABASE_URL` | Local database storage path | `file:./data/campusconnect.db` |

### 3. Development Server
Start the unified full-stack server (Vite + Express):
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Production Build
```bash
npm run build
npm start
```

---

## 🎬 70. Demo Flow Walkthrough

You can execute the exact hackathon demo flow:
1. **Organizer Login**: Click "Organizer Demo" or sign in with `organizer@campusconnect.demo`.
2. **Dashboard**: Navigate to `/organizer` and click **Create Event**.
3. **Create Event**:
   - Title: `AI & Machine Learning Workshop (Demo Session)`
   - Set Capacity to `3` for demonstration.
   - Click **Publish Event**.
4. **Log Out / Switch**: Click "Student Demo" in the top bar.
5. **Event Discovery**: Find the newly published workshop and open its details.
6. **Register**: Click **Register now**. Status shows `1 / 3 registered (Confirmed)`.
7. **Fill Capacity**: Switch to demo students `maya@campusconnect.demo` and `liam@campusconnect.demo` to register seats 2 and 3. The card now indicates `3 / 3 registered (Event full)`.
8. **Join Waitlist**: Switch to student `elena@campusconnect.demo` and click **Join waitlist**. Elena is assigned `Waitlisted` status.
9. **Cancellation & Promotion**: Return to Jordan Hayes's registrations (`/registrations`), and cancel his confirmed registration. Elena Rostova is immediately promoted from `WAITLISTED` to `CONFIRMED`.
10. **Organizer Review**: Switch to Organizer, open the event's **Participants** list, verify the updated statuses, and click **Export Roster (CSV)**.
11. **Close Event**: Click **Close Event**. Returning to the student view confirms that the registration button is disabled and indicates `Registration closed`.
