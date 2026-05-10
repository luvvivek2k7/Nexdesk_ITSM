# NexDesk — Digital Workplace Hub

> **Phase 1: ITSM Core** — Unified IT Service Management platform  
> Built with React 18 · Firebase · Tailwind CSS · Real Google OAuth

---

## 🚀 Getting Live in 15 Minutes (Step by Step)

### Step 1 — Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/nexdesk.git
cd nexdesk
npm install
```

---

### Step 2 — Create Firebase Project (FREE)

1. Go to **https://console.firebase.google.com**
2. Click **"Add project"** → name it `nexdesk-prod` → Continue
3. Disable Google Analytics (not needed) → **Create project**

#### Enable Authentication
1. Left sidebar → **Build → Authentication → Get Started**
2. Click **"Google"** provider → Enable → Add your support email → **Save**

#### Enable Firestore
1. Left sidebar → **Build → Firestore Database → Create database**
2. Choose **"Start in test mode"** (we'll apply proper rules later)
3. Pick your region (e.g., `asia-south1` for India) → **Enable**

#### Get your config
1. ⚙️ Project Settings (gear icon) → **Your apps** → Click **</>** (Web)
2. Register app name: `nexdesk-web` → **Register app**
3. Copy the `firebaseConfig` object — you'll need it in Step 3

---

### Step 3 — Set up environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and paste your Firebase values:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=nexdesk-prod.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=nexdesk-prod
VITE_FIREBASE_STORAGE_BUCKET=nexdesk-prod.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

---

### Step 4 — Apply Firestore security rules

```bash
# Install Firebase CLI (one time)
npm install -g firebase-tools

# Login
firebase login

# Set project
firebase use --add
# Select your nexdesk-prod project

# Deploy rules and indexes
firebase deploy --only firestore
```

---

### Step 5 — Run locally

```bash
npm run dev
```

Open **http://localhost:5173** — you'll see the NexDesk login screen.

**Sign in with Google** — the first user to sign in automatically becomes **Super Admin**.

---

### Step 6 — Deploy to Firebase Hosting

```bash
npm run deploy
```

Your app is now live at: `https://nexdesk-prod.web.app`

---

### Step 7 — Connect GitHub for auto-deploy

1. Push your repo to GitHub (make `.env.local` is in `.gitignore` ✅)
2. In GitHub repo → **Settings → Secrets and variables → Actions**
3. Add these secrets (same values as your `.env.local`):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `FIREBASE_SERVICE_ACCOUNT` (get from Firebase Console → Service Accounts → Generate new key)

4. Every `git push` to `main` now auto-builds and deploys.

---

## 👤 Testing All Personas

Since first login = Super Admin, here's how to test all 8 personas:

### Method 1: Multiple Google accounts
Sign in with different Google accounts. After first login, Super Admin can change any user's role:
1. Log in with secondary Google account
2. Log in as Super Admin → go to **Admin → Users**
3. Find the secondary user → change role from dropdown

### Method 2: Same machine — different browsers
- Chrome: Super Admin
- Firefox: IT Agent  
- Edge: Standard User
- Incognito: Manager

### Persona Quick Reference

| Persona        | What they see                                    |
|----------------|--------------------------------------------------|
| Super Admin    | Everything — full config, all users, all data    |
| IT Admin       | All tickets, SLA config, user management         |
| IT Agent       | Ticket queue, assign/resolve, internal comments  |
| Manager        | Team view, approvals, reports, read-only admin   |
| Standard User  | My tickets, service catalog, KB, notifications   |
| Developer      | API explorer (Phase 2)                           |
| HR             | HRMS module (Phase 3)                            |
| Field Engineer | FSO module (Phase 2)                             |

---

## 📁 Project Structure

```
nexdesk/
├── src/
│   ├── components/
│   │   ├── layout/           # AppShell, IconNav, Sidebar, Topbar
│   │   └── shared/           # UI primitives, AIWidget
│   ├── context/
│   │   ├── AuthContext.jsx   # Google OAuth + Firestore profiles + roles
│   │   └── ThemeContext.jsx  # Dark/light theme persisted in localStorage
│   ├── lib/
│   │   ├── firebase.js       # Firebase init + helpers
│   │   ├── constants.js      # Roles, permissions, SLA policies, categories
│   │   ├── sla.js            # SLA calculation engine (business hours aware)
│   │   └── ticketService.js  # All Firestore ticket CRUD + real-time listeners
│   ├── pages/
│   │   ├── LoginPage.jsx     # Google OAuth login
│   │   ├── PortalPage.jsx    # Persona-aware home dashboard
│   │   ├── itsm/             # ITSM module pages
│   │   ├── admin/            # Admin management pages
│   │   └── user/             # Profile, notifications
│   ├── styles/
│   │   └── globals.css       # Tailwind + CSS variables (dark/light tokens)
│   ├── App.jsx               # Router with protected routes
│   └── main.jsx              # Entry point
├── firestore.rules           # Firestore security rules
├── firestore.indexes.json    # Composite indexes
├── firebase.json             # Firebase hosting config
├── .env.example              # Environment variable template
└── .github/workflows/
    └── deploy.yml            # Auto-deploy on push to main
```

---

## 🗓 Roadmap

### ✅ Phase 1 (Now) — ITSM Core
- [x] Google OAuth + role-based auth
- [x] 8 personas with different dashboards
- [x] Dark/light theme toggle
- [x] Ticket engine (full lifecycle)
- [x] SLA management with real-time timers
- [x] Persona-aware dashboards
- [x] Service catalog
- [x] Knowledge base
- [x] AI widget (local logic)
- [x] Notifications
- [x] Admin user management
- [x] Firebase Hosting + GitHub Actions CI/CD

### 🔜 Phase 2 — ITAM, IAM, FSO, Visitor
- [ ] IT Asset Management (CMDB, lifecycle)
- [ ] Identity & Access Management (approval workflows)
- [ ] Field Service Operations (Google Maps, dispatch)
- [ ] Visitor Management (kiosk workflow, PACS)
- [ ] Real Claude API integration in AI widget
- [ ] Email notifications (SendGrid)
- [ ] SLA breach push notifications

### 🔮 Phase 3 — HRMS, Chatbot, Voicebot
- [ ] HRMS module (onboarding, leave, performance)
- [ ] Twilio chatbot integration
- [ ] Twilio voicebot (IVR, voice-to-ticket)
- [ ] Payroll module

### 🚀 Phase 4 — Enterprise
- [ ] Custom domain SSO (replace Google OAuth)
- [ ] Multi-tenant support
- [ ] API marketplace
- [ ] Mobile app (React Native)

---

## 💰 Cost During Testing — $0

| Service            | Free Tier                        |
|--------------------|----------------------------------|
| Firebase Auth      | 10,000 users/month               |
| Firestore          | 1GB storage, 50K reads/day       |
| Firebase Hosting   | 10GB/month bandwidth             |
| Firebase Functions | 2M invocations/month             |
| GitHub Actions     | 2,000 min/month                  |
| Claude API         | $5 free credit on signup         |
| Twilio             | $15 trial credit (no card)       |
| Google Maps        | $200/month credit                |

**Total during testing: $0**

---

## 🤝 Contributing

```bash
git checkout -b feat/my-feature
# make changes
git commit -m "feat(itsm): add bulk ticket assignment"
git push origin feat/my-feature
# open Pull Request
```

**Branch convention:** `feat/`, `fix/`, `docs/`, `refactor/`

---

*NexDesk — Built progressively, one phase at a time.*
