<div align="center">

# SISA-BRAPA API

**A backend that actually gets your money.**

Track spending, set budgets, manage subscriptions, and hit your savings goals all through one clean, secure REST API.

[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Redis](https://img.shields.io/badge/Redis-7.x-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Zod](https://img.shields.io/badge/Zod-3.x-3E67B1?style=for-the-badge&logo=zod&logoColor=white)](https://zod.dev/)
[![Docker](https://img.shields.io/badge/Docker-24.x-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Vitest](https://img.shields.io/badge/Vitest-1.x-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Swagger](https://img.shields.io/badge/Swagger-OpenAPI_3.0-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)](https://swagger.io/)
[![GitHub Actions](https://img.shields.io/badge/CI%2FCD-GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)](https://github.com/features/actions)
[![Nginx](https://img.shields.io/badge/Nginx-Reverse_Proxy-009639?style=for-the-badge&logo=nginx&logoColor=white)](https://nginx.org/)

</div>

---

## What is this?

Most "expense tracker" tutorials stop at basic CRUD. This one doesn't.

SISA-BRAPA API is a production-shaped backend the kind of thing you'd actually feel comfortable putting behind a real app. It handles the boring-but-critical stuff (auth, rate limiting, token blacklisting) and the actually-useful stuff (budgets that warn you before you overspend, subscriptions that track their own due dates, savings goals with a real audit trail) in one coherent system.

No shortcuts, no `any` types, no "TODO: add validation later."

---

## Architecture

```mermaid
flowchart TB
    Client["Client App<br/>(Web / Mobile)"]

    subgraph Edge["Edge Layer"]
        Nginx["Nginx<br/>Reverse Proxy"]
    end

    subgraph API["API Layer — Express + TypeScript"]
        Auth["Auth Module<br/>JWT + Refresh Token"]
        RateLimit["Rate Limiter<br/>+ Helmet + CORS"]
        Expenses["Expenses"]
        Budgets["Budgets"]
        Subs["Subscriptions"]
        Goals["Goals + Saving Log"]
        Export["Export Engine<br/>PDF / Excel"]
        Analytics["Analytics Engine<br/>Trends + MoM"]
        Docs["Swagger UI<br/>/docs"]
    end

    subgraph Data["Data Layer"]
        Prisma["Prisma ORM"]
        Postgres[("PostgreSQL<br/>(Neon)")]
        Redis[("Redis<br/>(Upstash)<br/>Blacklist + Cache")]
    end

    subgraph CI["CI/CD"]
        Actions["GitHub Actions"]
        Tests["Vitest"]
        Deploy["Vercel"]
    end

    Client --> Nginx --> RateLimit --> Auth
    Auth --> Expenses & Budgets & Subs & Goals
    Expenses --> Export
    Expenses --> Analytics
    Auth -. token check .-> Redis
    Expenses & Budgets & Subs & Goals --> Prisma --> Postgres
    Analytics --> Redis
    Client -.-> Docs

    Actions --> Tests --> Deploy
```

Every request funnels through rate limiting and auth before it touches business logic. Redis sits alongside Postgres as a fast lane — killing blacklisted tokens instantly and caching the analytics queries that would otherwise hammer the database every time someone opens their dashboard.

---

## Core Features

### Auth & Security

Short-lived access tokens paired with refresh tokens, so sessions stay alive without leaving long-lived tokens lying around. Logged-out tokens get pushed into a Redis blacklist with an automatic TTL no cron jobs cleaning up after themselves. Login and register endpoints get their own tighter rate limits on top of the global one, and Helmet + CORS keep the HTTP layer locked down.

### Expense Management

Full CRUD on transactions title, amount, category (food, transport, utilities, whatever), date, optional notes. Indexed queries mean filtering by category or date range stays fast even as the table grows.

### Smart Budgeting

Set a monthly cap, either per category or across everything. The system won't let you accidentally create two active budgets for the same category in the same month one source of truth, always.

### Subscriptions & Recurring Bills

Netflix, Spotify, whatever else quietly drains your account every month track it here. Supports weekly, monthly, and yearly billing cycles, and the status (active, pending, cancelled, expired) updates itself based on the current date instead of you having to babysit it.

### Goals & Savings Log

Set a target "Emergency Fund," "New Laptop," whatever you're saving toward — with a deadline and a running balance. Every deposit gets its own entry in the Saving Log, so you can always see exactly how you got to your total, not just the total itself.

### Export Engine

Pull your full expense history as a clean `.xlsx`, or generate a formal `.pdf` report with grand totals and auto-paginated tables when the data won't fit on one page.

### Analytics & Insights

Category breakdowns as percentages, spending trends grouped by day or month across any window (today, 7 days, 30 days, 6 months, or a custom range), and a month-over-month comparison that tells you flat out whether you're saving or bleeding money compared to the same point last month.

---

## Tech Stack

| Layer         | Technology                                                                                                                  | Why                                          |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Runtime       | ![Node.js](https://img.shields.io/badge/-Node.js_20-339933?style=flat-square&logo=nodedotjs&logoColor=white)                | Fast, event-driven, everywhere               |
| Language      | ![TypeScript](https://img.shields.io/badge/-TypeScript_5-3178C6?style=flat-square&logo=typescript&logoColor=white)          | Type safety end to end, zero `any`           |
| Framework     | ![Express](https://img.shields.io/badge/-Express_4-000000?style=flat-square&logo=express&logoColor=white)                   | Lightweight, unopinionated, battle-tested    |
| Database      | ![PostgreSQL](https://img.shields.io/badge/-PostgreSQL_16-4169E1?style=flat-square&logo=postgresql&logoColor=white)         | Relational integrity where money is involved |
| ORM           | ![Prisma](https://img.shields.io/badge/-Prisma_5-2D3748?style=flat-square&logo=prisma&logoColor=white)                      | Type-safe queries, painless migrations       |
| Cache / Store | ![Redis](https://img.shields.io/badge/-Redis_7-DC382D?style=flat-square&logo=redis&logoColor=white)                         | Token blacklisting + hot analytics caching   |
| Validation    | ![Zod](https://img.shields.io/badge/-Zod_3-3E67B1?style=flat-square&logo=zod&logoColor=white)                               | Keeps garbage data out at the door           |
| Docs          | ![Swagger](https://img.shields.io/badge/-OpenAPI_3.0-85EA2D?style=flat-square&logo=swagger&logoColor=black)                 | Interactive, testable API docs               |
| Testing       | ![Vitest](https://img.shields.io/badge/-Vitest_1-6E9F18?style=flat-square&logo=vitest&logoColor=white)                      | Fast, modern unit + integration tests        |
| Containers    | ![Docker](https://img.shields.io/badge/-Docker_24-2496ED?style=flat-square&logo=docker&logoColor=white)                     | Consistent local + prod environments         |
| CI/CD         | ![GitHub Actions](https://img.shields.io/badge/-GitHub_Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white) | Test and ship on every push                  |
| Reverse Proxy | ![Nginx](https://img.shields.io/badge/-Nginx-009639?style=flat-square&logo=nginx&logoColor=white)                           | TLS termination + request routing            |
| Deployment    | ![Vercel](https://img.shields.io/badge/-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)                        | Serverless-friendly hosting                  |
| DB Hosting    | ![Neon](https://img.shields.io/badge/-Neon-00E599?style=flat-square&logo=postgresql&logoColor=white)                        | Serverless Postgres                          |
| Cache Hosting | ![Upstash](https://img.shields.io/badge/-Upstash-00E9A3?style=flat-square&logo=redis&logoColor=white)                       | Serverless Redis                             |

---

## Database Schema

One `User` sits at the center, with everything else hanging off it in a clean one-to-many relationship:

- **User** → credentials, profile, refresh token
- **Expense** → transaction history
- **Budget** → monthly spending caps
- **Subscription** → recurring bills
- **Goal** → savings targets
- **SavingLog** → deposits tied back to a `Goal`

Full schema lives in [`prisma/schema.prisma`](prisma/schema.prisma).

---

## API Endpoints

Interactive docs are served live at `/docs` once the server's running.

| Route                | What it does                                                |
| -------------------- | ----------------------------------------------------------- |
| `/api/auth`          | Register, login, refresh token, logout                      |
| `/api/expenses`      | Create, update, delete, export (PDF/Excel), trend analytics |
| `/api/budgets`       | Set and monitor monthly category budgets                    |
| `/api/subscriptions` | Manage recurring bills and due-date tracking                |
| `/api/goals`         | Savings targets and deposit log                             |

---

<div align="center">

</div>
