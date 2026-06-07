# NexDesk Phase 2 — Deployment Notes

## Files Changed (drop-in replace in your repo)
- src/App.jsx                          → Added AboutPage, AssignmentGroups, Workflow routes
- src/components/layout/IconNav.jsx    → Added About/Info button
- src/pages/PortalPage.jsx             → All Phase 2 modules now Live; announcements updated
- src/pages/AboutPage.jsx              → NEW: Developer info, roadmap, copyright
- src/pages/admin/AdminLayout.jsx      → Added Groups, Workflow nav items
- src/pages/admin/SettingsPage.jsx     → Workflow Builder button navigates correctly; v2.1.0
- src/pages/fso/FSODashboard.jsx       → New Work Order form working
- src/pages/hrms/HRMSDashboard.jsx     → Add Employee form working
- src/pages/iam/IAMDashboard.jsx       → Request Access form working
- src/pages/itam/ITAMDashboard.jsx     → Add Asset modal working
- src/pages/visitor/VisitorDashboard.jsx → Pre-register form saves visitor name
- firestore.rules                      → Full Phase 2 rules (all collections secured)

## Deploy Steps
1. Copy all files from src/ into your repo's src/ (replacing existing)
2. Copy firestore.rules to repo root (replacing existing)
3. git add . && git commit -m "Phase 2: fix all module buttons, add About page, update Firestore rules"
4. git push → GitHub Actions deploys automatically

## No other changes needed
- firebase.json: unchanged
- package.json: unchanged
- CI/CD workflow: unchanged
- .firebaserc: unchanged
