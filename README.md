# 🏙 TitleVault Property Registry Monorepo

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB.svg?logo=react)
![Python](https://img.shields.io/badge/Backend-Python%20Flask-3776AB.svg?logo=python)
![Supabase](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E.svg?logo=supabase)

**TitleVault** is a next-generation **Land Registry System** designed to revolutionize how property ownership, surveying data, and land titles are recorded. 

Traditional land registries rely heavily on fragmented paper deeds, static PDF maps, and siloed databases. These outdated systems often lead to overlapping property lines, fraudulent claims, fractional ownership disputes, and excruciatingly slow auditing processes. TitleVault eliminates these issues by creating a single, immutable source of truth for urban property.

### 🏛 How the Land Registry Workflow Operates
1. **The Spatial Survey (3D Mapping):** Instead of flat paper maps, a Surveyor drafts the exact geometric bounds of a property. They build a precise hierarchy of **Parcels** (the land itself), **Buildings**, **Floors**, and **Components** (individual apartments or units).
2. **Assigning Legal Rights:** The Surveyor then allocates strict legal **Rights** (ownership percentages) to physical individuals for each specific spatial component.
3. **The Intelligence Layer:** Before a submission is even seen by a human, TitleVault's algorithmic engine automatically flags overlapping boundaries, impossible topology layouts, ownership that exceeds 100%, and calculates a historic risk score to prevent fraud.
4. **The Audit Protocol:** The Property Auditor reviews the interactive 3D property graph via their specialized dashboard. If all legal rules and spatial constraints pass, the deed is immutably registered to the TitleVault database.

## ✨ System Features

### 📡 Real-Time Intelligence & Infrastructure
- **Server-Sent Events (SSE):** Cross-role live push notifications. Property auditors instantly see when a surveyor submits or amends a payload without needing to refresh pages.
- **Supabase Cloud Native:** Fully integrated with **Supabase PostgreSQL** for robust RDBMS data integrity and **Supabase Storage** (S3 Protocol) for blob document hosting.
- **SHA-256 Data Integrity:** Tamper-proof, cryptographically verifiable chain-of-custody hashes embedded within every document and revision.

### 🧠 Automated Audit & Analysis Layer
- **Pure-Python Spatial Engine:** Zero-dependency geometry engine utilizing the **Shoelace formula** to auto-calculate topology perimeters, intersecting bounds, area verification, and detect illegal polygon self-intersections.
- **Algorithmic Risk Scoring:** Calculates heuristic scores (Low/Medium/High Risk) by analyzing historical transfers, oversized shares, and spatial anomalies.
- **Conflict Detection:** Intercepts impossible topology operations (e.g. assigning floating components to missing floors or combined ownerships exceeding 100%).
- **Automated Change Classification:** Code diffing engine automatically isolates structural updates vs document revisions across child submissions.

### ⚡ Architectural Performance
- **Turbocharged Bundle:** 75% smaller initial frontend JS bundle. Tree-shaken production environments achieve instant load times enabled by dynamic chunking and lazy-loaded WebGL models.
- **Strictly Typed Ecosystem:** Leveraging `pnpm` workspaces, the backend and frontend perfectly align using `@udhbha/types` — eradicating generic payloads and ensuring robust data handling.
- **Zero-Friction JSON Importing:** Modularized 100+ line local and external data bootstrapping enabling immediate visual prototyping.

---

## 🏗️ Monorepo Structure

```text
TitleVault/
├── apps/
│   ├── surveyhub-registry/    # Surveyor React/Vite Frontend
│   └── property-auditor-hub/  # Auditor React/Vite Frontend
├── backend/                   # Python Flask API & Intelligence Services
│   ├── routes/                # Blueprint APIs (Auth, Submissions, SSE)
│   ├── services/              # Pure functions (Conflict, Risk, Geometry)
│   └── models/                # SQLAlchemy schemas mapped to Supabase
├── packages/                  # Shared Workspace Dependencies
│   └── types/                 # Universal TypeScript definitions 
├── pnpm-workspace.yaml        # Monorepo Orchestrator
└── package.json
```

---

## 🚀 Quick Start Guide

You will need **Python 3.9+**, **Node.js (v18+)**, and **pnpm** installed on your machine.

### 1. Boot up the Backend

```bash
# Navigate to the backend directory
cd backend

# Create a virtual environment and activate it 
python3 -m venv venv
source venv/bin/activate  # (On Windows: venv\Scripts\activate)

# Install pure-python PostgreSQL drivers and Flask dependencies
pip install -r requirements.txt

# Run the Flask Server
flask run --debug
```

### 2. Launch the Frontends

In a **separate terminal window**:

```bash
# Ensure you are at the monorepo root
cd TitleVault

# Install workspace dependencies cross-linked via pnpm
pnpm install

# Start local development servers across all apps
pnpm -r dev
```

The apps will launch locally (typically on ports `:5173` and `:5174`). Follow the console links to begin surveying!

---

## 🔧 Environment Variables

Make sure to construct an `.env` file within the `backend/` directory if connecting to a fresh database:

```env
# Database — Supabase PostgreSQL
DATABASE_URL=postgresql+pg8000://postgres:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

# Supabase Storage & API Configuration
SUPABASE_URL=https://[YOUR-REFERENCE-ID].supabase.co
SUPABASE_KEY=[YOUR-SERVICE-ROLE-KEY-OR-ANON-KEY]

# Security config
JWT_SECRET=super_secret_override_in_production
TOKEN_EXPIRY_HOURS=24
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
```

> **Note:** Do not forget to establish a bucket entitled `documents` inside of Supabase Storage configured for public access.

---

## 📜 License

This software is provided under the [MIT License](LICENSE).
