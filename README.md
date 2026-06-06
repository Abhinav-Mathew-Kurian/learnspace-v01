# LearnSpace

A full-stack private online course platform built for coaching institutes and independent educators. Invite-only access, multi-role dashboards, AI-powered course assistant, live session scheduling, attendance tracking, and a public-facing storefront.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.6 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Database | MongoDB Atlas (Mongoose ODM) |
| Auth | Auth.js v5 (NextAuth beta) — Credentials provider, JWT |
| File Storage | Cloudinary |
| AI | OpenRouter free-tier LLM API (streaming SSE) |
| PDF Processing | pdf-parse v2 (pdfjs-dist) |
| Rich Text | Tiptap v3 |
| Calendar | react-big-calendar |
| Animations | Framer Motion |
| Testing | Jest 30 + React Testing Library + Playwright |
| Deployment | Vercel (Hobby) |

---

## Features

### Public (no login required)

- **Landing page** — hero section, course categories, promotions carousel, free webinars, course grid with pricing, How It Works, testimonials & ratings, enquiry form
- **Course browser** — `/courses` grid with search/filter; `/courses/[id]` detail page with first-video preview
- **Enquiry form** — contact form posted directly to admin inbox
- **Buy / Enroll flow** — inline mini-form per course that routes enquiries to admin

### Admin

- **Dashboard** — enrollment stats, revenue overview, batch activity, upcoming events
- **Student management** — searchable list with tabs (Active / Expired / Banned / Deactivated), per-student detail page, edit subscription type & expiry, ban with reason, deactivate
- **Teacher management** — CRUD, per-teacher detail with their courses and sessions
- **Course management** — create/edit/delete courses, set price + original price + currency, assign teachers
- **Video management** — per-course video list, YouTube embed, chapters, PDF resources with AI extraction
- **Batch management** — create batches, assign students and teachers
- **Attendance** — mark attendance per batch session, view per-student records
- **Live sessions** — schedule and manage live classes per batch
- **Events** — create events, assign guest lecturers, sidebar notification badge
- **Enquiries** — inbox with unread badge (real-time count via SSE events), mark-read, reply via email
- **Ratings** — view and moderate student ratings
- **Webinars** — manage public webinar listings
- **Promotions** — manage promotional banners shown on homepage
- **Analytics** — enrollment trends, course completion rates, batch attendance breakdown
- **Guest lecturers** — CRUD for external speakers linked to events

### Teacher

- **Dashboard** — assigned courses, upcoming sessions, student progress summary
- **Course content** — manage videos, chapters, PDF uploads for assigned courses
- **Live classes** — schedule and start sessions
- **Student list** — view students enrolled in their courses
- **Calendar** — full month/week/day view of their schedule (react-big-calendar)
- **Profile** — update name, bio, avatar

### Student

- **Dashboard** — enrolled courses, progress bars, upcoming events and live sessions
- **Course player** — YouTube IFrame player, chapter navigation, progress auto-saved, comments per video
- **AI assistant** — per-course chatbot grounded on uploaded PDFs and video transcripts (streaming responses, guardrails)
- **PDF resources** — download course PDFs from Cloudinary
- **Live classes** — join links and schedule
- **Calendar** — personal schedule view
- **Profile** — update details, view subscription status
- **Installment tracking** — view course payment installment schedule and pending amounts

---

## Project Structure

```
learnspace/
├── app/
│   ├── (auth)/login/          # Login page with ban/expiry error states
│   ├── about/                 # Public about page
│   ├── how-it-works/          # Public how-it-works page
│   ├── courses/               # Public course browser + detail
│   ├── admin/                 # Admin portal (dashboard, students, teachers, courses…)
│   ├── teacher/               # Teacher portal
│   ├── student/               # Student portal
│   └── api/                   # All API route handlers
│       ├── auth/              # NextAuth + preflight check
│       ├── admin/             # Admin-only endpoints
│       ├── public/            # Unauthenticated read endpoints
│       ├── ai/ask/            # Streaming AI endpoint (SSE)
│       ├── upload/pdf/        # PDF upload + text extraction (SSE progress)
│       └── …                  # courses, batches, attendance, events, live, etc.
├── components/
│   ├── shared/                # AppShell, Sidebar, Pagination, PageTransition
│   ├── admin/                 # SetPriceModal, admin-specific UI
│   ├── home/                  # BuyButton, BuyModal, PriceTag, homepage sections
│   └── ui/                    # Generic UI primitives
├── models/                    # Mongoose schemas (17 models)
├── lib/                       # DB connection, auth config, Cloudinary helpers, OpenRouter
├── hooks/                     # useProgress, client-side custom hooks
├── types/                     # Shared TypeScript types
├── scripts/                   # Seed and backfill scripts (safe to run in dev)
├── __tests__/                 # Jest unit + integration tests
├── e2e/                       # Playwright end-to-end tests
├── proxy.ts                   # Next.js 16 routing middleware (replaces middleware.ts)
├── next.config.ts
├── playwright.config.ts
└── .env.example               # Template — copy to .env.local and fill in values
```

---

## Data Models

| Model | Purpose |
|---|---|
| `User` | Students, teachers, admins — single collection, role-based |
| `Course` | Course metadata, price, currency, assigned teacher |
| `Video` | YouTube video per course, chapters, order |
| `PDFResource` | Uploaded PDF metadata + extracted text for AI |
| `Batch` | A cohort of students assigned to a course |
| `Enrollment` | Student ↔ Course link with installment tracking |
| `CourseInstallment` | Payment installment records per enrollment |
| `Progress` | Per-student per-video watch progress |
| `Attendance` | Per-student per-session attendance record |
| `LiveSession` | Scheduled live class linked to a batch |
| `Comment` | Video discussion comments |
| `CommentDedup` | Deduplication guard for comment creation |
| `Event` | Campus/online events with guest lecturers |
| `Enquiry` | Public contact/enroll enquiries (admin inbox) |
| `Rating` | Student star ratings + review text |
| `Promotion` | Homepage promotional banners |
| `PublicWebinar` | Free webinar listings shown on homepage |
| `AiRequest` | Audit log of AI assistant queries |

---

## API Reference

### Public (no auth)

| Method | Route | Description |
|---|---|---|
| GET | `/api/public/courses` | List published courses |
| GET | `/api/public/webinars` | List upcoming free webinars |
| GET | `/api/public/promotions` | List active promotions |
| GET | `/api/public/comments` | Comments for a video |
| POST | `/api/enquiries` | Submit contact / enroll enquiry |
| POST | `/api/ratings` | Submit a course rating |

### Auth

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/preflight` | Pre-login status check (ban / expiry / deactivated) |
| GET/POST | `/api/auth/[...nextauth]` | NextAuth handlers |

### Admin

| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/admin/users` | List / create users |
| GET/PATCH/DELETE | `/api/admin/users/[id]` | Fetch / update / delete user |
| GET/POST | `/api/admin/enrollments` | List / create enrollments |
| GET/POST | `/api/admin/enquiries` | List enquiries |
| PATCH | `/api/admin/enquiries/[id]` | Mark enquiry as read |
| GET/POST | `/api/admin/webinars` | Manage webinars |
| GET/POST | `/api/admin/promotions` | Manage promotions |
| GET/POST | `/api/admin/ratings` | Manage ratings |
| GET/POST | `/api/admin/guest-lecturers` | Manage guest lecturers |
| GET/POST | `/api/admin/course-installments` | Manage installment plans |

### Courses & Content

| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/courses` | List / create courses |
| GET/PATCH/DELETE | `/api/courses/[id]` | Course detail / update / delete |
| GET/POST | `/api/batches` | List / create batches |
| PATCH/DELETE | `/api/batches/[id]` | Update / delete batch |
| GET/POST | `/api/events` | Events list / create |
| PATCH/DELETE | `/api/events/[id]` | Update / delete event |
| GET/POST | `/api/live` | Live sessions |
| PATCH/DELETE | `/api/live/[id]` | Update / delete session |
| GET/POST | `/api/attendance` | Mark / fetch attendance |
| GET/POST | `/api/comments` | Post comment |
| DELETE | `/api/comments/[id]` | Delete comment |

### Student

| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/progress` | Get / update video progress |
| GET | `/api/student/progress-summary` | All-courses progress summary |
| GET | `/api/student/enrollments` | Student's enrolled courses |
| GET | `/api/student/course-installments` | Student's installment records |

### AI & Upload

| Method | Route | Description |
|---|---|---|
| POST | `/api/ai/ask` | Streaming AI answer (SSE) |
| POST | `/api/upload/pdf` | PDF upload + extraction (SSE progress stream) |
| GET | `/api/download` | Proxy Cloudinary PDF download with correct headers |
| PATCH | `/api/profile` | Update user profile |
| GET | `/api/users` | Current user info |

---

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB Atlas cluster (free M0 works)
- Cloudinary account (free tier works)
- OpenRouter account (free tier works)

### 1. Clone and install

```bash
git clone https://github.com/Abhinav-Mathew-Kurian/learnspace-v01.git
cd learnspace-v01
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in every value. See `.env.example` for the full list of required variables.

### 3. Seed the admin user

```bash
npx ts-node scripts/seed-admin.ts
```

This creates the initial admin account. Edit the script first to set your desired email and password.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `NEXTAUTH_SECRET` | Random 32-char string for JWT signing |
| `NEXTAUTH_URL` | Your app URL (http://localhost:3000 in dev) |
| `AUTH_TRUST_HOST` | Set to `true` on Vercel |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `OPENROUTER_MODEL` | Model ID (default: meta-llama/llama-3.1-8b-instruct:free) |
| `NEXT_PUBLIC_APP_URL` | Public URL (used in OpenRouter HTTP-Referer) |

---

## Testing

```bash
# Unit + integration tests (Jest)
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# End-to-end tests (Playwright)
npm run test:e2e

# Playwright UI mode
npm run test:e2e:ui
```

The test suite has 340+ Jest tests across 29 suites and 50 Playwright E2E tests.

---

## Deployment (Vercel)

1. Push to GitHub
2. Import the repo in [vercel.com](https://vercel.com)
3. Add all environment variables from `.env.example` in the Vercel dashboard
4. Deploy — Vercel auto-detects Next.js

> **Note:** The Vercel Hobby plan has a 10-second serverless function timeout. PDF extraction is capped at 80 pages and AI responses use small fast models to stay within this limit.

---

## User Roles

| Role | Access |
|---|---|
| `admin` | Full platform control — users, content, billing, analytics |
| `teacher` | Their courses, students, live sessions, calendar |
| `student` | Enrolled courses, AI assistant, live schedule, calendar |
| Public | Browse courses, view webinars, submit enquiries |

Access is enforced at both the route level (`proxy.ts`) and the API level (session checks on every handler).

---

## AI Assistant

Each course has a built-in AI assistant powered by OpenRouter. It:

- Grounds answers in uploaded PDF text and YouTube video transcripts
- Streams responses token-by-token via Server-Sent Events
- Refuses off-topic questions with a strict out-of-scope message
- Blocks restricted content (violence, exploits, jailbreaks, adult content) with a one-line hard block
- Falls back through a model chain (8B → 7B → 9B → 26B → 120B) with a 12-second timeout per model

---

## License

Private — all rights reserved. Not for redistribution.
