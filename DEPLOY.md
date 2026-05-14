# NexDesk — Deployment & Fix Guide

## What was fixed in this update

### 🔐 Firestore Rules (firestore.rules)
- **Root cause of "update failed"**: rules were too restrictive
- Users can now update their own profile (name, phone, dept) — role field blocked
- `meta` collection fully writable by any signed-in user (needed for first-login bootstrap)
- Tickets: any signed-in user can create; agents/admins can update any; users can add comments to own tickets

### 🗄️ Storage Rules (storage.rules) — NEW file
- Avatars: user can upload their own photo (2MB max)
- Ticket attachments: any signed-in user (10MB max)
- Knowledge assets: agents/admins only
- ITAM assets: admins only

### 👤 Auth & Super Admin
- `luvvivek2k7@gmail.com` is **hardcoded as Super Admin** — gets the role on every login
- First user to sign in also gets Super Admin (fallback)
- If existing account has wrong role, it auto-corrects on next login

### 🎫 Ticket Creation Fix
- `requesterId` is now always set from the authenticated user
- `generateTicketId` uses a safe fallback if index not ready
- All Firestore errors show human-readable messages

### 📋 User Management
- Super Admin can create placeholder users by email
- IT Admin can change roles (except super_admin)
- Role dropdown visible in the Users table
- Edit modal for name, dept, phone, status

---

## Step-by-step to apply these fixes

### 1. Deploy Firestore rules (CRITICAL — fixes all write errors)

```bash
cd nexdesk
firebase login
firebase use --add   # select your project: nexdesk-itsm
firebase deploy --only firestore
```

You should see:
```
✔  firestore: updated rules
✔  firestore: updated indexes
Deploy complete!
```

### 2. Enable Firebase Storage (for file uploads)

```bash
# In Firebase Console: Build → Storage → Get Started
# Choose: Start in production mode
# Select region: asia-south1 (same as Firestore)
# Then deploy storage rules:
firebase deploy --only storage
```

### 3. Add your domain to Firebase Auth

Go to: Firebase Console → Authentication → Settings → Authorised domains

Add:
- `nexdesk-itsm.firebaseapp.com` ✅ (already there)
- `nexdesk-itsm.web.app` ✅ (already there)
- `localhost` ✅ (already there)

### 4. Fix Super Admin role for luvvivek2k7@gmail.com

**Option A — Auto-fix on next login:**
Sign out and sign back in with `luvvivek2k7@gmail.com`.
The updated AuthContext will detect the email and set role = `super_admin` automatically.

**Option B — Manual fix in Firestore:**
1. Firebase Console → Firestore → users collection
2. Find the document with email = `luvvivek2k7@gmail.com`
3. Edit the `role` field → change to `super_admin`
4. Save

### 5. Update GitHub secrets for CI/CD auto-deploy

Add this new secret in GitHub → Settings → Secrets → Actions:

```
FIREBASE_TOKEN
```

To get your token:
```bash
firebase login:ci
# Copy the token shown
```

Then push to main — GitHub Actions will auto-deploy rules + hosting.

### 6. Create test users for persona testing

Once logged in as Super Admin:
1. Go to **Admin → Users**
2. Click **Add User**
3. Fill: Name, Email, Role, Department
4. Click **Create User**

The user gets the assigned role when they first sign in with that Google account.

**Quick test matrix:**
| Email to create | Role to assign | What they see |
|----------------|----------------|---------------|
| agent@yourco.com | it_agent | Ticket queue, SLA timers, internal comments |
| manager@yourco.com | manager | Team view, approvals, reports |
| hr@yourco.com | hr | HRMS module, leave management |
| field@yourco.com | field_engineer | FSO module, work orders, dispatch |
| dev@yourco.com | developer | Standard portal (API tools Phase 2) |
| user@yourco.com | user | Self-service portal, own tickets only |

---

## Modules now live (Phase 1 + Phase 2)

| Module | URL | Roles |
|--------|-----|-------|
| Portal | /portal | Everyone |
| ITSM | /itsm | Everyone |
| ITAM | /itam | Admin, Agent, Manager |
| IAM | /iam | Admin, Manager |
| HRMS | /hrms | Admin, HR, Manager |
| FSO | /fso | Admin, Field Engineer, Manager |
| Visitor | /visitor | Admin, Manager |
| Admin | /admin | Super Admin, IT Admin |

---

## Common errors and exact fixes

| Error | Cause | Fix |
|-------|-------|-----|
| "Update failed" on profile | Firestore rules not deployed | `firebase deploy --only firestore` |
| "Permission denied" creating ticket | Rules too strict | Same as above |
| "auth/unauthorized-domain" | Domain not whitelisted | Firebase Console → Auth → Settings → Add domain |
| No super_admin role after login | Email not matching | Sign out, sign in again — AuthContext will fix it |
| ITAM/IAM/FSO shows access denied | Role not assigned | Admin → Users → Change role |
| Firestore index error in console | Composite index building | Wait 2-3 minutes after first deploy, or click the link in the error |

