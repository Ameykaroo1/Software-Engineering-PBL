# MediCore — Resource Allocation & Management System for Multi-Speciality Hospitals

[![Node.js Version](https://img.shields.io/badge/Node.js-v24.13.0-green.svg)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/React-v18.3.1-blue.svg)](https://reactjs.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-v5.22.0-indigo.svg)](https://www.prisma.io/)
[![Database](https://img.shields.io/badge/Database-MySQL%20%2F%20SQLite%20Dual%20Support-orange.svg)](https://www.mysql.com/)
[![Tests](https://img.shields.io/badge/Tests-20%2F20%20Passed-brightgreen.svg)]()

MediCore is an enterprise-grade full-stack web application built to replace manual hospital resource management with a centralized, ACID-compliant system that tracks, allocates, and monitors **Hospital Beds**, **Operation Theatres**, **Medical Equipment**, **Ambulances**, and **Diagnostic Facilities**.

---

## 1. System Architecture & Tech Stack

- **Frontend**: React.js 18 with Vite, Tailwind CSS, Lucide React icons, and Recharts.
- **Backend**: Node.js & Express.js REST API with modular MVC architecture (routes, controllers, services, middleware, validators).
- **Database**: MySQL 8.0 with Prisma ORM and SQL migrations (with automated SQLite test & standalone fallback).
- **Security & IAM**: JWT with secure HTTP-only cookies, bcrypt 10-round password hashing, and strict Role-Based Access Control (RBAC).
- **Validation**: Zod schema validation across all API boundaries.
- **Concurrency & Integrity**: Database transaction locks (`prisma.$transaction`) with double-check availability validation, conflict detection, and immutable audit logs.

```
medicore/
├── backend/
│   ├── src/
│   │   ├── controllers/       # HTTP request handlers
│   │   ├── middleware/        # JWT auth, RBAC authorization, error handling
│   │   ├── routes/            # REST API route definitions
│   │   ├── services/          # Business logic, state machines, transactions
│   │   ├── validators/        # Zod validation schemas
│   │   ├── app.js             # Express app setup & middleware
│   │   └── server.js          # Server entrypoint & DB lifecycle
│   ├── prisma/
│   │   ├── schema.prisma      # MySQL production schema with native enums
│   │   ├── schema.sqlite.prisma # Standalone & test SQLite schema
│   │   ├── migrations/        # Timestamped SQL database migrations
│   │   └── seed.js            # Reproducible database seed script
│   ├── tests/
│   │   └── medicore.test.js   # 20 end-to-end integration tests
│   ├── .env.example           # Example environment variables
│   ├── .env                   # Active environment configuration
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable badges, modal, stat cards, spinner
│   │   ├── context/           # React AuthContext (JWT session state)
│   │   ├── layouts/           # DashboardLayout with responsive role sidebar
│   │   ├── pages/             # 4 Role Dashboards & 8 Operational Pages
│   │   ├── services/          # ApiClient fetch wrapper
│   │   ├── App.jsx            # Dynamic view & role routing
│   │   ├── main.jsx           # React DOM root
│   │   └── index.css          # Tailwind CSS & print media styles
│   ├── index.html
│   ├── vite.config.js         # Vite configuration with /api proxy
│   ├── tailwind.config.js
│   └── package.json
├── docker-compose.yml         # 1-click MySQL 8.0 container service
├── package.json               # Root convenience runner scripts
└── README.md
```

---

## 2. Four Defined User Roles & Authorization Matrix

The application strictly implements the 4 roles specified in the SRS:

| User Role | Dashboard & Permissions | Restricted Access |
|---|---|---|
| **Hospital Administrator** | • Global hospital dashboard<br>• Register hospital resources<br>• View real-time availability<br>• Allocate hospital resources<br>• Manage & release allocation records<br>• Generate utilization reports (CSV / Print)<br>• Retire obsolete resources | Cannot access user account administration or raw system audit logs |
| **Reception Staff** | • Front desk triage dashboard<br>• Check availability summary<br>• Allocate available beds, theatres, equipment, diagnostics<br>• **Emergency ambulance allocation** (Rapid 1-click dispatch)<br>• View allocation outcomes | Cannot register new resources, cannot view reports, cannot manage users |
| **Department Coordinator** | • Department-specific dashboard<br>• View department resources<br>• Update availability & status for **assigned department only**<br>• Preventive cleaning & repair transitions | Isolated to their assigned department. Cannot modify other departments or retire resources |
| **System Administrator** | • IAM administration dashboard<br>• Manage user accounts (Create, Edit, Activate/Deactivate)<br>• Assign the 4 defined roles<br>• Secure password resets<br>• View immutable system audit logs | Cannot modify their own role; cannot deactivate the sole active SysAdmin |

---

## 3. Five Supported Resource Categories

1. **Hospital Beds**: General Ward, ICU, Emergency Resuscitation, Deluxe Private Rooms (includes oxygen ports, ventilator hooks, isolation status).
2. **Operation Theatres**: Cardiac Surgery, Neurosurgery, General/Laparoscopic, Trauma OT (readiness telemetry, overlapping schedule prevention).
3. **Medical Equipment**: Hamilton Ventilators, Defibrillators, ECMO units, Dialysis systems, Infusion pumps (atomic multi-unit quantity tracking).
4. **Ambulances**: Advanced Life Support (ALS Mobile ICU), Basic Life Support (BLS Transfer), Rapid Response Vans (emergency allocation workflow).
5. **Diagnostic Facilities**: 3.0T MRI Scanner, 128-Slice Dual Source CT Scanner, Color Doppler Ultrasound, Digital X-Ray, Automated Pathology Line.

---

## 4. Resource Lifecycle State Machine (Experiment 5)

All status changes are governed by `StateMachineService` with strict transition validation:

```
[Resource Created]
       │
       ▼
  [AVAILABLE] ──────────► [ALLOCATED] ──────────► [IN USE / OCCUPIED]
       ▲                      │                             │
       │                      │ (Cancelled/Released)        │ (Released)
       │                      ▼                             ▼
       │               [AVAILABLE]               [CLEANING / MAINTENANCE]
       │                                                    │
       └────────────────────────────────────────────────────┘ (Sanitization Passed)
       │                                                    │
       │ (Defect)                                           │ (Deeper Defect)
       ▼                                                    ▼
[OUT OF SERVICE] ─────────────────────────────────► [UNDER REPAIR]
       ▲                                                    │
       └────────────────────────────────────────────────────┘ (Repair & QA Passed)
       │
       ▼ (Admin Only)
[RETIRED / DISPOSED] ──► (Terminal state; permanently archived)
```

---

## 5. Getting Started & Installation

### Prerequisites
- Node.js (v18+ or v24+)
- npm (v9+)
- MySQL 8.0 (or run via provided `docker-compose.yml`)

### Option A: Running with MySQL (Recommended for Production)

1. Start MySQL container using Docker Compose:
```bash
docker compose up -d
```
*Or configure your local MySQL server on port 3306 with database `medicore_db`.*

2. Configure environment in `backend/.env`:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="mysql://root:password@localhost:3306/medicore_db"
JWT_SECRET=medicore_hospital_secure_jwt_secret_key_2026_production_grade
JWT_EXPIRES_IN=8h
FRONTEND_URL=http://localhost:5173
```

3. Run migrations and database seed:
```bash
cd backend
npx prisma migrate deploy
node prisma/seed.js
```

### Option B: Standalone Zero-Setup Execution (SQLite)

The backend includes dual schema support allowing zero-setup execution and automated testing out of the box:
```bash
cd backend
# Seed dev database
node prisma/seed.js
```

---

## 6. Running the Application

### 1. Start the Backend API Server:
```bash
cd backend
npm run dev
# Server listening on http://localhost:5000
```

### 2. Start the Frontend Client:
```bash
cd frontend
npm run dev
# Application running on http://localhost:5173
```

Open `http://localhost:5173` in your web browser.

---

## 7. Demo Accounts for Immediate Testing

The login screen includes **one-click demo credential pills** for testing all 4 roles:

| Role | Username | Email | Password | Assigned Scope |
|---|---|---|---|---|
| **Hospital Administrator** | `admin` | `admin@medicore.hospital` | `AdminPassword123!` | Hospital-Wide |
| **Reception Staff** | `reception` | `reception@medicore.hospital` | `Reception123!` | Emergency & Triage |
| **Department Coordinator** | `coord_icu` | `coord_icu@medicore.hospital` | `CoordPassword123!` | Intensive Care Unit (ICU) |
| **System Administrator** | `sysadmin` | `sysadmin@medicore.hospital` | `Sysadmin123!` | System IAM & Audit |

---

## 8. Automated Integration Testing

All 20 test scenarios specified in the requirements were executed and verified against the database:

```bash
cd backend
npm test
```

### Execution Results:
```
✔ Scenario 1: Valid login succeeds and returns user profile & JWT token
✔ Scenario 2: Invalid credentials correctly rejected with 401
✔ Scenario 3: Unauthenticated API access blocked with 401
✔ Scenario 4: Role-based authorization prevents Reception Staff from accessing System Admin routes
✔ Scenario 5: Hospital Administrator registers a new hospital bed resource
✔ Scenario 6: Reception Staff checks resource availability and summary
✔ Scenario 7: Reception Staff successfully allocates an available bed
✔ Scenario 8: Rejects allocation when resource is already ALLOCATED
✔ Scenario 9: Duplicate allocation blocked even if requested again immediately
✔ Scenario 10: Prevents overlapping booking for the same Operation Theatre during conflicting time window
✔ Scenario 11: Emergency ambulance allocation initiates with EMERGENCY priority and logs dispatch
✔ Scenario 12: Department Coordinator updates status of resource in their own department
✔ Scenario 13: System Administrator creates, updates, and controls user accounts
✔ Scenario 14: Releasing allocation marks allocation RELEASED and resource to CLEANING_MAINTENANCE
✔ Scenario 15: Resource moves from CLEANING_MAINTENANCE to AVAILABLE after sanitization
✔ Scenario 16: Fault transition: AVAILABLE -> OUT_OF_SERVICE -> UNDER_REPAIR -> AVAILABLE
✔ Scenario 17: Administrator retires resource; retired resource cannot transition or be allocated
✔ Scenario 18: Audit logs record all domain events and are accessible by System Administrator
✔ Scenario 19: Utilization report calculates exact formula-based capacity and rates
✔ Scenario 20: Concurrent allocation requests for single-unit resource permit only ONE winner

ℹ tests 20 | pass 20 | fail 0 | cancelled 0
```

---

## 9. REST API Endpoint Reference

### Authentication
- `POST /api/auth/login` — Authenticate user, issue JWT & HTTP-only cookie.
- `POST /api/auth/logout` — Invalidate session & clear cookie.
- `GET /api/auth/me` — Return authenticated user profile & department.

### Resources
- `GET /api/resources` — List resources with searching, filtering, and pagination.
- `GET /api/resources/:id` — Retrieve single resource with allocation history.
- `POST /api/resources` — Register new resource (*Hospital Administrator*).
- `PUT /api/resources/:id` — Update resource details.
- `PATCH /api/resources/:id/status` — Execute validated lifecycle transition (*Validated by State Machine*).
- `POST /api/resources/:id/retire` — Permanently retire & archive resource (*Admin only*).
- `GET /api/resources/availability` — Category and hospital-wide availability matrix.

### Allocations
- `GET /api/allocations` — Filterable allocation records history.
- `GET /api/allocations/:id` — Allocation details and linked audit entries.
- `POST /api/allocations` — Commit allocation with double-check locking & conflict checks.
- `POST /api/allocations/:id/release` — Release allocation and trigger maintenance cycle.

### Emergency Ambulance
- `GET /api/ambulances/available` — Fleet readiness and standby status.
- `POST /api/ambulances/:id/allocate` — Rapid emergency allocation with EMERGENCY priority.

### Utilization Reports
- `GET /api/reports/utilization` — Calculate database utilization rates per category & department.
- `GET /api/reports/allocations` — Date-range allocation logs.
- `GET /api/reports/export` — Download CSV report file.

### User Account IAM
- `GET /api/users` — List accounts (*System Administrator*).
- `POST /api/users` — Provision new user account (*System Administrator*).
- `PUT /api/users/:id` — Update staff profile or role (*System Administrator*).
- `PATCH /api/users/:id/status` — Toggle active / deactivated status (*System Administrator*).
- `POST /api/users/:id/reset-password` — Securely set temporary password (*System Administrator*).

### Audit Logs
- `GET /api/audit-logs` — Immutable audit stream (*System Administrator*).

---

## 10. Operational Considerations & Limitations

1. **Physical Dispatch vs. Software Allocation**: As required, this system manages the digital allocation, reservation, scheduling, and lifecycle tracking of hospital beds, operation theatres, equipment, ambulances, and diagnostic machines. It does not replace emergency dispatch radio communication systems or hardware telemetry.
2. **Medical Privacy (HIPAA/GDPR)**: Patient references in demo environments are fictionalized (`PT-XXXX`). For clinical deployment with Protected Health Information (PHI), database encryption at rest and field-level encryption for patient references should be activated.
3. **Database Concurrency**: The application utilizes ACID transaction isolation (`prisma.$transaction`) to guarantee that concurrent requests for the same bed or overlapping operation theatre bookings strictly result in one winner and reject conflicting attempts.
