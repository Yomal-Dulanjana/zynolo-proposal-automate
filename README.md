# D-Tech Proposal Automation Platform

Enterprise-grade Proposal Automation Web Application built with **Astro (SSR mode with `@astrojs/node`)**, **React**, **Tailwind CSS**, **Prisma ORM (MySQL / TiDB)**, **Puppeteer**, and **Nodemailer**.

---

## 🚀 Key Features

1. **Authentication & Profile Management**
   - Sales Rep Sign-Up (Full Name, Mobile Number, Email, Password).
   - Secure Login with JWT stored in an `HttpOnly`, `SameSite=Strict` cookie.
   - Password hashing with `bcryptjs` (salt rounds: 12).
   - 6-digit numeric OTP generation sent via SMTP for password recovery (10-minute expiry window).
   - Profile update modal: Sales reps can modify their mobile number and change their password.

2. **Dynamic Proposal Form & Real-Time Calculation Engine**
   - Client details: Name, Address, Email, and drag-and-drop Logo upload (`/api/upload-logo`).
   - Dynamic Sales Rep binding: PDF and email notifications automatically bind to the logged-in representative.
   - Real-time VAT calculation:
     $$\text{Base Amount} = \text{Employee Count} \times \text{Rate}$$
     $$\text{VAT (18\%)} = \text{Base Amount} \times 0.18$$
     $$\text{Total Amount} = \text{Base Amount} + \text{VAT}$$
   - Auto-generated Proposal ID (`DTPZPV` + timestamp + random digits) and 21-day expiry calculation.

3. **Pixel-Perfect Multi-Page PDF Generation (Puppeteer)**
   - Replicates corporate 7-page proposal document:
     - **Page 1 (Cover)**: Client Logo box, Target details, Proposal ID, Version 1.0.0, and Proposal Date.
     - **Page 2**: Executive Summary & Engagement Highlights.
     - **Page 3**: Scope of Services & Deliverables.
     - **Page 4**: Why D-Tech Solutions (Differentiators & Trust Signals).
     - **Page 5 (Financials)**: Itemized table with duration, employee count, Base Amount, 18% VAT, and Total Amount.
     - **Page 6 (Terms & Conditions)**: Binding clauses with dynamic expiry clause (`Proposal Date + 21 days`).
     - **Page 7 (Contact Page)**: Logged-in Sales Representative card with Name, Mobile, and Email.

4. **Executive Email Pipeline (Nodemailer)**
   - Custom SMTP integration supporting `.env` configurations.
   - Transmits branded executive HTML emails with the generated PDF attached directly to the Client and CC'd to the Sales Rep.

5. **Sales Representative Dashboard**
   - Overview metrics (Total Proposals, Active, Expired, Pipeline Value).
   - Searchable, sortable proposal data table.
   - Actions: One-click Re-send Email, Stream/Download PDF, Edit Proposal, and Delete.

---

## 🛠️ Tech Stack

- **Framework**: [Astro 7](https://astro.build/) (`output: 'server'`) with `@astrojs/node` standalone adapter
- **Interactive UI**: [React 19](https://react.dev/) via `@astrojs/react`
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with Crimson Red (`#dc2626`), Deep Slate (`#0f172a`), and clean white surfaces
- **Icons**: [Lucide React](https://lucide.dev/)
- **Database & ORM**: MySQL / TiDB compatible schema via [Prisma ORM](https://www.prisma.io/)
- **PDF Engine**: [Puppeteer](https://pptr.dev/) (Headless Chrome)
- **Email Engine**: [Nodemailer](https://nodemailer.com/)

---

## 📁 Project Structure

```text
proposal-automation/
├── prisma/
│   └── schema.prisma             # MySQL / TiDB Prisma schema
├── public/
│   ├── favicon.svg               # SVG brand favicon
│   ├── pdfs/                     # Persisted proposal PDFs
│   └── uploads/                  # Client logo uploads
├── src/
│   ├── components/
│   │   ├── AuthForms.tsx         # Login, Signup, Forgot/Reset forms
│   │   ├── ProfileModal.tsx      # Rep profile and security update form
│   │   ├── ProposalDashboard.tsx # Data table with sorting, search & actions
│   │   └── ProposalForm.tsx      # Interactive proposal form with live VAT calc
│   ├── layouts/
│   │   ├── AppLayout.astro       # Authenticated shell with sidebar & header
│   │   └── AuthLayout.astro      # Public split-screen authentication layout
│   ├── lib/
│   │   ├── auth.ts               # JWT, bcrypt, OTP & cookie handlers
│   │   ├── db.ts                 # Prisma Client singleton
│   │   ├── email.ts              # Nodemailer transport & HTML templates
│   │   ├── pdf.ts                # Puppeteer multi-page PDF generation engine
│   │   └── proposals.ts          # ID generation, financial math & date helpers
│   ├── pages/
│   │   ├── api/
│   │   │   ├── auth/             # signup, login, logout, forgot/reset password
│   │   │   ├── profile/          # Profile retrieval & update
│   │   │   ├── proposals/        # GET, POST, [id].ts (PUT, DELETE, resend, download)
│   │   │   └── upload-logo.ts    # Multipart file upload endpoint
│   │   ├── proposals/            # All proposals, new, [id]/edit
│   │   ├── dashboard.astro       # Rep dashboard overview
│   │   ├── forgot-password.astro # OTP reset page
│   │   ├── index.astro           # Root routing
│   │   ├── login.astro           # Login page
│   │   ├── profile.astro         # Profile settings page
│   │   └── signup.astro          # Sales rep registration
│   ├── styles/
│   │   └── global.css            # Tailwind base, utilities & brand design tokens
│   ├── env.d.ts                  # Type definitions for Astro.locals
│   └── middleware.ts             # Auth route guard and session resolution
├── astro.config.mjs              # Astro SSR configuration
├── package.json
├── tailwind.config.mjs           # Enterprise Crimson/Slate theme tokens
└── tsconfig.json
```

---

## ⚙️ Environment Variables (`.env`)

```env
# Database (MySQL / TiDB)
DATABASE_URL="mysql://user:password@localhost:3306/proposal_automation"

# Authentication
JWT_SECRET="your-super-secure-jwt-secret-change-this-in-production"
JWT_EXPIRES_IN="7d"
COOKIE_NAME="pa_session"

# Application URLs
PUBLIC_APP_URL="http://localhost:4321"

# SMTP Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="D-Tech Proposals <your-email@gmail.com>"

# Storage
UPLOAD_DIR="./public/uploads"
PDF_DIR="./public/pdfs"
MAX_FILE_SIZE="5242880"
```

---

## 🏁 Getting Started

1. **Install Dependencies**:
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Database Migration / Sync**:
   ```bash
   npm run db:generate
   npm run db:push
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:4321](http://localhost:4321) in your browser.

4. **Production Build & Launch**:
   ```bash
   npm run build
   node ./dist/server/entry.mjs
   ```
