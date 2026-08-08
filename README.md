# Omex Dubai Import & Admin Management System

A full-stack, production-ready web application built with **React**, **TypeScript**, **Tailwind CSS**, **Express.js**, and **Firebase Firestore / Local Storage**.

---

## 🌟 Key Features & Architecture

### 1. 🔐 Admin Password & Security Management
- **Password Updates**: Dedicated "Password & Security" tab in the Admin Panel allowing authenticated admins to securely update passwords with verification of current password and confirmation.
- **Password Recovery & OTP**: Time-limited password reset flow issuing hashed tokens and OTP verification sent directly via SMTP / Resend API to the registered admin email address.
- **Security Audit Logs**: Comprehensive logging of all authentication events, password changes, failed login attempts, and administrative actions with IP and timestamp auditing.

### 2. 📦 Comprehensive Site Backup & Restore System
- **Full Data Backup**: Downloads complete database snapshots (orders, user profiles, CMS configuration, pricing rules, and application settings).
- **Manual & Scheduled Backups**: Manual instant downloads plus background cron-based scheduling (every 4, 6, 12, or 24 hours, or custom interval).
- **Restore Engine**: One-click restore functionality with clear safety prompts to restore full store state from any snapshot or uploaded JSON backup file.

### 3. 📊 Site Visits & Visitor Analytics
- **Live Traffic Tracking**: Automatic client-side page view pinging (`/api/analytics/track-visit`) capturing visitor IDs, unique IP addresses, HTTP referrers, and timestamps.
- **Time-Based Filtering**: Real-time breakdown of visits, unique visitors, completed purchases/buyers, revenue, and conversion rates across **Today**, **This Week**, **This Month**, **This Year**, and **All-Time**.
- **Interactive Visualizations**: 7-day comparative trend charts comparing traffic vs. completed orders, plus live streaming visitor logs.

---

## 🛠️ Tech Stack & Dependencies

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Framer Motion
- **Backend**: Express.js (Node.js), TypeScript, `tsx` in Dev, `esbuild` for CJS production bundling
- **Database & Auth**: Firebase Firestore (or in-memory JSON storage fallback) & Firebase Auth
- **Email Service**: SMTP (Nodemailer / Gmail) & Resend API integration
- **AI Integrations**: `@google/genai` (Google Gemini 2.5) for automated currency & product price scraping

---

## 🚀 Local Development Setup

### 1. Requirements
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/your-org/omex-dubai-import.git
cd omex-dubai-import

# Install dependencies
npm install
```

### 3. Environment Variables Setup
Copy the example environment file and configure your keys:
```bash
cp .env.example .env
```

Edit `.env` with your actual credentials:
```env
# Gemini AI Key
GEMINI_API_KEY="your_gemini_api_key"

# Firebase Credentials
VITE_FIREBASE_API_KEY="your_firebase_api_key"
VITE_FIREBASE_AUTH_DOMAIN="your_app.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your_project_id"
VITE_FIREBASE_STORAGE_BUCKET="your_app.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
VITE_FIREBASE_APP_ID="your_app_id"

# Email Configuration (SMTP / Resend)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="admin@example.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@example.com"
RESEND_API_KEY="re_123456789"
```

### 4. Running the App
```bash
# Start development server (Frontend + Express backend on port 3000)
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## ⚙️ Cron Jobs for Scheduled Backups

The Express backend automatically runs an internal background timer based on the backup frequency set in the admin panel. If you prefer using system **cron** (e.g. Linux crontab or GitHub Actions), invoke the endpoint:

```bash
# Trigger scheduled backup via CRON endpoint
curl -X POST http://localhost:3000/api/admin/backups/create \
  -H "Content-Type: application/json" \
  -H "x-admin-token: YOUR_ADMIN_TOKEN"
```

---

## ☁️ Deployment Instructions

### Option 1: Deploying to Vercel / Render / Cloud Run
1. **Build the Application**:
   ```bash
   npm run build
   ```
2. **Start Command**:
   ```bash
   npm run start
   ```
3. Set all environment variables defined in `.env.example` in your hosting dashboard.

### Option 2: Deploying to Firebase Hosting & Cloud Functions
1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   firebase login
   ```
2. Initialize Firebase in the root folder:
   ```bash
   firebase init
   ```
3. Deploy Firestore rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

---

## 🔒 Security Best Practices

- Always store secrets in `.env` or standard hosting environment secret managers.
- Keep `GEMINI_API_KEY` and `SMTP_PASS` server-side only (never expose them to the browser).
- Regularly check the **Password & Security** audit log tab in the admin panel for unauthorized access attempts.

---

## 📄 License
MIT License. Open-source and free to modify for commercial use.
