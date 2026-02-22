<p align="center">
  <h1 align="center">🔐 Crack The Vault</h1>
  <p align="center">
    An LLM-powered security game where users attempt to convince an AI to release funds from a guarded vault.
    <br />
    Built with <strong>FastAPI · Next.js · Expo · Drizzle ORM · Docker · Neon PostgreSQL</strong>
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Expo-54-000020?logo=expo&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/Neon_PostgreSQL-4169E1?logo=postgresql&logoColor=white" />
</p>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Folder Structure](#-folder-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup (controller-pc)](#1-backend-setup-controller-pc)
  - [Client App Setup (client-side)](#2-client-app-setup-client-side)
  - [Admin Panel Setup (admin-side)](#3-admin-panel-setup-admin-side)
- [How It Works](#-how-it-works)
- [API Reference](#-api-reference)
- [Database Schema](#-database-schema)
- [Tech Stack](#-tech-stack)
- [Environment Variables](#-environment-variables)
- [License](#-license)

---

## 🎯 Overview

**Crack The Vault** is an interactive, LLM-powered security game designed as a college symposium project. Players submit persuasive arguments to an AI system, trying to "crack" a virtual vault and transfer funds to their wallet.

### Core Game Loop

1. **Player submits** a persuasive message via the chat UI
2. **Injection filter** checks for prompt injection attempts
3. **LLM classifies** argument quality, emotional manipulation, and rule-breaking attempts
4. **Policy engine scores** the request against a **dynamic threshold** that increases with difficulty
5. **If approved**, funds are transferred from the vault to the player's wallet
6. **Security level rises** as more players win — making it progressively harder for everyone

---

## 🏗 Architecture

```
┌──────────────┐     ┌──────────────────────────────────────────────────┐
│              │     │          controller-pc (Docker Compose)          │
│  client-side │     │                                                  │
│  (Next.js +  │────▶│  ┌──────────┐  ┌──────────────┐  ┌───────────┐  │
│   Expo App)  │     │  │   API    │  │   Policy     │  │    DB     │  │
│              │     │  │ Gateway  │─▶│   Engine     │─▶│  Service  │──│──▶ Neon PostgreSQL
└──────────────┘     │  │  :8000   │  │   :8001      │  │  :8002    │  │
                     │  └──────────┘  └──────────────┘  └───────────┘  │
┌──────────────┐     │       │                                         │
│  admin-side  │     │       ▼                                         │
│  (Next.js    │     │  Modal-hosted LLM                               │
│  Admin Panel)│     └──────────────────────────────────────────────────┘
└──────────────┘
```

| Service | Port | Stack | Role |
|---------|------|-------|------|
| **API Gateway** | `8000` | FastAPI (Python) | Request routing, injection filtering, LLM integration |
| **Policy Engine** | `8001` | FastAPI (Python) | Scoring, dynamic thresholds, reward calculation |
| **DB Service** | `8002` | Express + Drizzle (Node.js) | Database operations via REST API |
| **Client App** | `3000` | Next.js + Expo | Player-facing chat UI with cyberpunk theme |
| **Admin Panel** | `3001` | Next.js | Admin dashboard with 3D visualizations |

---

## 📁 Folder Structure

```
College Sympo/
│
├── controller-pc (Anti gravitty)/     # 🖥️ Backend (Docker Compose)
│   ├── api-gateway/                   #   FastAPI — routes, LLM calls, injection filter
│   │   ├── app/
│   │   │   ├── main.py                #     /chat and /info endpoints
│   │   │   ├── llm_service.py         #     Modal-hosted LLM integration
│   │   │   ├── parser.py              #     LLM response validation
│   │   │   ├── schemas.py             #     Pydantic request/response models
│   │   │   └── config.py              #     Environment config
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── policy-engine/                 #   FastAPI — game logic & scoring
│   │   ├── app/
│   │   │   ├── main.py                #     /evaluate endpoint
│   │   │   ├── policy_service.py      #     Core scoring & threshold logic
│   │   │   ├── database.py            #     HTTP client for db-service
│   │   │   ├── wallet_service.py      #     Vault ↔ wallet transfers
│   │   │   ├── responses.py           #     Canned response messages
│   │   │   ├── session_service.py     #     Session tracking
│   │   │   ├── models.py              #     DB entity models
│   │   │   └── schemas.py             #     Request/response schemas
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── db-service/                    #   Express + Drizzle ORM
│   │   ├── src/
│   │   │   ├── index.ts               #     REST API endpoints
│   │   │   ├── schema.ts              #     Drizzle table definitions
│   │   │   └── db.ts                  #     Neon PostgreSQL connection
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── frontend/                      #   Static chat UI
│   │   ├── index.html
│   │   ├── style.css                  #     Cyberpunk/hacker theme
│   │   └── script.js                  #     Chat logic & API calls
│   │
│   ├── docker-compose.yaml            #   Orchestration config
│   ├── architecture.md                #   Detailed architecture docs
│   ├── test_request.py                #   Manual API testing script
│   └── requirements.txt               #   Root Python dependencies
│
├── client-side/                       # 📱 Player App (Next.js + Expo)
│   ├── app/
│   │   ├── page.tsx                   #     Landing page
│   │   ├── login/                     #     Authentication
│   │   ├── chat/                      #     Chat interface
│   │   ├── arena/                     #     Game arena
│   │   └── api/                       #     API routes (chat, login, balance, etc.)
│   ├── components/                    #   Reusable UI components
│   │   ├── HeroSection.tsx            #     Landing hero with animations
│   │   ├── HackerBackground.tsx       #     Matrix-style background
│   │   ├── ThreeBackground.tsx        #     3D background effects
│   │   ├── NavHeader.tsx              #     Navigation header
│   │   └── ...                        #     Animated buttons, inputs, etc.
│   ├── contexts/                      #   React context providers
│   ├── hooks/                         #   Custom React hooks
│   ├── lib/                           #   Database utilities & migrations
│   │   ├── schema.ts                  #     Drizzle schema
│   │   ├── db.ts                      #     Database connection
│   │   ├── seed.ts                    #     Seed data scripts
│   │   └── migrate.ts                 #     Migration utilities
│   └── package.json
│
├── admin-side/                        # 🛡️ Admin Dashboard (Next.js)
│   ├── app/
│   │   ├── page.tsx                   #     Dashboard with stats
│   │   └── api/                       #     Admin API & attack checking
│   ├── components/
│   │   ├── SecurityShield3D.tsx       #     3D security visualization
│   │   └── Vault3D.tsx                #     3D vault visualization
│   ├── lib/
│   │   ├── schema.ts                  #     Drizzle schema
│   │   └── db.ts                      #     Database connection
│   └── package.json
│
├── .gitignore
└── README.md                          # ← You are here
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| [Node.js](https://nodejs.org/) | ≥ 18 | Client & admin apps, DB service |
| [Python](https://www.python.org/) | ≥ 3.11 | API gateway & policy engine |
| [Docker](https://www.docker.com/) | Latest | Backend orchestration |
| [Docker Compose](https://docs.docker.com/compose/) | v2+ | Multi-container management |

### 1. Backend Setup (`controller-pc`)

```bash
# Navigate to the backend directory
cd "controller-pc (Anti gravitty)"

# Create a .env file with required variables (see Environment Variables section)
cp .env.example .env

# Build and start all backend services
docker compose up --build
```

Once running, the services will be available at:
- **API Gateway** → `http://localhost:8000`
- **Policy Engine** → `http://localhost:8001`
- **DB Service** → `http://localhost:8002`

> [!TIP]
> Open `frontend/index.html` in a browser for the built-in chat UI, or use the `test_request.py` script:
> ```bash
> python test_request.py
> ```

### 2. Client App Setup (`client-side`)

```bash
# Navigate to the client directory
cd client-side

# Install dependencies
npm install

# Start the development server
npm run dev
```

The client app will be available at `http://localhost:3000`.

### 3. Admin Panel Setup (`admin-side`)

```bash
# Navigate to the admin directory
cd admin-side

# Install dependencies
npm install

# Start the development server
npm run dev
```

The admin panel will be available at `http://localhost:3001`.

---

## ⚙ How It Works

### Scoring Formula

```
final_score = (logical_score × 0.4) + specificity + coherence + confidence_bonus − manipulation_penalty
```

| Factor | Source | Weight |
|--------|--------|--------|
| **Logical Score** | LLM `argument_quality` → strong=0.9, medium=0.65, weak=0.4 | ×0.4 |
| **Specificity** | Keyword detection (family, rent, hospital…) | 0 – 0.35 |
| **Coherence** | Causal words (because, since, therefore…) | 0.05 – 0.15 |
| **Confidence Bonus** | LLM `confidence_band` → high=0.15, medium=0.08, low=0 | Additive |
| **Manipulation Penalty** | Pressure words + LLM `emotional_manipulation` | Subtractive |

### Dynamic Threshold

```
threshold = 0.55 + (security_level × 0.02) + (user_failures × 0.02, max 0.10) + (user_wins × 0.03, max 0.15)
```

> Capped at **0.80**. The game gets harder as more players succeed.

### Reward Tiers

| Score Range | Base Reward | Security Multiplier |
|-------------|-------------|---------------------|
| ≥ 0.85 | $300 | 1 + (level−1) × 0.10 |
| ≥ 0.75 | $200 | 1 + (level−1) × 0.10 |
| ≥ 0.65 | $100 | 1 + (level−1) × 0.10 |
| < 0.65 | $50 | 1 + (level−1) × 0.10 |

### Security Layers

1. **Injection Filter** — Regex-based prompt injection detection at the API gateway
2. **Rule Violation Detection** — Forbidden phrases trigger immediate rejection
3. **Cooldown System** — Max 5 attempts per user per 60 seconds
4. **Dynamic Threshold** — Difficulty scales with wins and security level
5. **Failed Attempt Tracking** — Repeated failures raise threshold; auto-reset at 5

---

## 📡 API Reference

### API Gateway (`:8000`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/chat` | Submit a persuasion attempt |
| `GET` | `/info` | Get vault stats, security level, user wallet balance |

#### `POST /chat` — Request Body

```json
{
  "user_id": 1,
  "message": "Your persuasive argument here",
  "session_id": "optional-session-uuid"
}
```

#### `POST /chat` — Response

```json
{
  "status": "approved",
  "message": "Your argument was convincing...",
  "reward": 200,
  "wallet_balance": 500,
  "vault_balance": 9500,
  "security_level": 2
}
```

### Policy Engine (`:8001`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/evaluate` | Evaluate a parsed LLM response and score the attempt |

### DB Service (`:8002`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/users` | List all users |
| `GET` | `/users/:id` | Get user by ID |
| `POST` | `/users` | Create a new user |
| `PATCH` | `/users/:id` | Update user stats |
| `GET` | `/global-stats` | Get vault balance & security level |
| `PATCH` | `/global-stats` | Update global stats |
| `POST` | `/wallet/transfer` | Transfer funds from vault to user |
| `GET` | `/transactions/count-recent` | Count recent transactions (cooldown check) |
| `POST` | `/transactions` | Log a transaction |

---

## 🗄 Database Schema

```
┌─────────────┐       ┌──────────────┐       ┌──────────────────┐
│    USERS     │       │    WALLET    │       │   GLOBAL_STATS   │
├─────────────┤       ├──────────────┤       ├──────────────────┤
│ id (PK)     │──┐    │ id (PK)      │       │ id (PK)          │
│ username    │  │    │ user_id (FK) │       │ total_wins       │
│ failed_     │  ├───▶│ balance      │       │ security_level   │
│  attempts   │  │    │ is_main      │       └──────────────────┘
│ wins        │  │    └──────────────┘
│ last_attempt│  │    ┌──────────────┐       ┌──────────────────┐
│  _time      │  │    │   SESSIONS   │       │  TRANSACTIONS    │
└─────────────┘  │    ├──────────────┤       ├──────────────────┤
                 ├───▶│ session_id   │       │ id (PK)          │
                 │    │  (PK)        │       │ user_id           │
                 │    │ user_id (FK) │       │ session_id        │
                 │    │ has_approved │       │ amount            │
                 │    │ created_at   │       │ decision          │
                 └───▶│              │       │ reason            │
                      └──────────────┘       │ created_at        │
                                             └──────────────────┘
```

Hosted on **[Neon](https://neon.tech/)** — serverless PostgreSQL with auto-suspend and auto-scaling.

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Client App** | Next.js 16, React 19, Expo 54, Framer Motion, TailwindCSS, Three.js |
| **Admin Panel** | Next.js 16, React 19, Three.js (3D visualizations), Drizzle ORM |
| **API Gateway** | FastAPI, Uvicorn, HTTPX |
| **Policy Engine** | FastAPI, Uvicorn, HTTPX |
| **DB Service** | Express.js, Drizzle ORM, postgres.js |
| **Database** | Neon PostgreSQL (Serverless) |
| **LLM** | Modal-hosted model endpoint |
| **Container** | Docker, Docker Compose |
| **Language** | Python 3.11, TypeScript 5, JavaScript |

---

## 🔑 Environment Variables

### `controller-pc (Anti gravitty)/.env`

```env
LLM_API_KEY=your_modal_llm_api_key
LLM_API_URL=https://your-modal-endpoint.modal.run
```

### `controller-pc (Anti gravitty)/db-service/.env`

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
PORT=8002
```

### `client-side/.env`

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
```

### `admin-side/.env`

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
```

> [!CAUTION]
> Never commit `.env` files to version control. The `.gitignore` is configured to exclude them.

---

## 📄 License

This project was built as a college symposium project. Feel free to fork and modify for educational purposes.

---

<p align="center">
  Built with ❤️ using FastAPI, Next.js, Expo & Docker
</p>
