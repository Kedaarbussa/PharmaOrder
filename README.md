# 💊 PharmaOrder - Production Pharmacy Order Tracking System

**PharmaOrder** is a cloud-hosted pharmacy order and payment balance tracking web application built with **Node.js, Express, MongoDB Atlas, HTML5, Vanilla CSS, and JavaScript (SPA)**, configured for deployment on **Vercel Serverless Functions**.

---

## 🌟 Key Features

- **🔒 Secure Google OAuth Authentication**: Single-click Google Sign-in with automatic user provisioning & JWT session protection.
- **📦 Order Lifecycle Tracking**: Full tracking across statuses (`Requested`, `Ordered from Wholesaler`, `Received at Store`, `Ready for Pickup`, `Completed`, `Cancelled`).
- **💰 Automatic Balance Math & Payment Settlement**: Real-time remaining balance calculation (`Total Price - Advance Paid`) with one-click payment settlement.
- **⏱️ Automated 7-Day Order Cleanup**: Dual-redundancy cleanup using **Vercel Cron Jobs** and **MongoDB TTL Index** to remove completed orders 7 days after completion.
- **📊 Real-Time Dashboard Metrics**: Instant counts for Total Orders, Pending Orders, Ready for Pickup, Completed Orders, and Total Outstanding Unpaid Payments.
- **🔍 Advanced Search & Filtering**: Real-time multi-field search and status filtering.
- **📄 One-Click CSV Export**: Download full active orders report in CSV format.
- **🎨 Responsive Modern Emerald Theme**: Light and Dark Mode UI with glassmorphism, responsive tables for desktop, and mobile card layouts.

---

## 📂 Project Structure

```
PharmaOrder/
├── api/
│   └── index.js              # Express serverless handler for Vercel Functions
├── config/
│   └── db.js                 # Serverless connection-pooled Mongoose MongoDB handler
├── models/
│   ├── User.js               # Mongoose User model (Google OAuth profiles)
│   └── Order.js              # Mongoose Order model (pre-save balance math & TTL index)
├── middleware/
│   └── authMiddleware.js     # JWT bearer token verification middleware
├── routes/
│   ├── authRoutes.js         # Google login token verification & JWT generation
│   ├── orderRoutes.js        # Orders CRUD, settlement & CSV export endpoints
│   └── cronRoutes.js         # Daily cleanup endpoint for completed orders older than 7 days
├── public/
│   ├── index.html            # SPA single-page HTML layout
│   ├── css/
│   │   └── style.css         # Emerald Green & Slate Gray design system with Dark/Light mode
│   └── js/
│       ├── api.js            # Fetch API wrapper with JWT headers & error handling
│       ├── auth.js           # Google Identity Services SDK integration
│       └── app.js            # Core SPA logic, table/card rendering, modals & toasts
├── .env.example              # Environment variables template
├── package.json              # Express, Mongoose, Google Auth Library, JWT dependencies
├── server.js                 # Standalone Express server for local development
├── vercel.json               # Vercel Serverless rewrite rules & Cron job schedule
└── README.md                 # Complete setup, OAuth, MongoDB, and deployment guide
```

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla CSS3 (Custom Variables, Light/Dark Modes), Vanilla JavaScript (ES6+ SPA)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas with Mongoose ORM
- **Authentication**: Google Identity Services (Google OAuth 2.0 ID Token) + JWT
- **Deployment**: Vercel Serverless Functions & Static Hosting

---

## ⚡ Quick Local Development Setup

### 1. Prerequisites
- Node.js (v18 or higher)
- MongoDB Atlas database cluster
- Google Cloud Console OAuth 2.0 Client ID

### 2. Installation
Clone repository and install node modules:
```bash
npm install
```

### 3. Environment Variables Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` and fill in your credentials:
```env
PORT=3000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/pharmaorder?retryWrites=true&w=majority
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
JWT_SECRET=super_secret_jwt_key_at_least_32_characters_long
CRON_SECRET=optional_cron_secret_key
```

### 4. Run Locally
```bash
npm run dev
```
Open `http://localhost:3000` in your web browser.

---

## 🍃 MongoDB Atlas Setup Guide

1. Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new **Database Cluster** (Free Shared Tier M0 is sufficient).
3. Under **Database Access**, create a database user with read & write privileges.
4. Under **Network Access**, add `0.0.0.0/0` (Allow Access from Anywhere) so Vercel Serverless Functions can connect.
5. Click **Connect** on your cluster -> Choose **Drivers (Node.js)**.
6. Copy the connection string (e.g. `mongodb+srv://<user>:<password>@cluster.mongodb.net/pharmaorder?retryWrites=true&w=majority`) and set it as `MONGODB_URI`.

---

## 🔐 Google OAuth Setup Guide

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project named **PharmaOrder**.
3. Navigate to **APIs & Services** -> **OAuth consent screen**:
   - User Type: **External** (or Internal for Google Workspace).
   - Fill in App Name ("PharmaOrder"), User support email, and Developer contact information.
   - Save and continue.
4. Navigate to **APIs & Services** -> **Credentials**:
   - Click **+ Create Credentials** -> **OAuth client ID**.
   - Application type: **Web application**.
   - Name: **PharmaOrder Web Client**.
   - **Authorized JavaScript origins**:
     - `http://localhost:3000`
     - `https://your-app-name.vercel.app` (your Vercel deployment URL)
   - Click **Create**.
5. Copy the generated **Client ID** (ends with `.apps.googleusercontent.com`) and paste it as `GOOGLE_CLIENT_ID` in your environment variables.

---

## 🚀 Vercel Deployment Instructions

Deploying PharmaOrder to Vercel takes less than 2 minutes:

### Option A: Via GitHub (Recommended)
1. Push this repository to **GitHub**.
2. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New Project**.
3. Import your **PharmaOrder** GitHub repository.
4. Expand **Environment Variables** and add:
   - `MONGODB_URI` = `mongodb+srv://...`
   - `GOOGLE_CLIENT_ID` = `your-client-id.apps.googleusercontent.com`
   - `JWT_SECRET` = `your_random_secret_string`
   - `CRON_SECRET` = `your_cron_secret_string` (Optional)
5. Click **Deploy**. Vercel will automatically build and host your app.

### Option B: Via Vercel CLI
```bash
npm i -g vercel
vercel
```

---

## ⏰ Automated 7-Day Order Cleanup Setup

PharmaOrder implements dual-redundancy cleanup for completed orders:

### Approach 1: Vercel Cron Jobs (Primary)
The included `vercel.json` contains:
```json
"crons": [
  {
    "path": "/api/cron/cleanup",
    "schedule": "0 0 * * *"
  }
]
```
Vercel automatically triggers `/api/cron/cleanup` once per day at 00:00 UTC. The endpoint finds and deletes all orders where `status == 'Completed'` and `completedAt <= 7 days ago`.

### Approach 2: MongoDB TTL Index (Secondary)
The `Order.js` schema includes an automatic Mongoose TTL index:
```javascript
orderSchema.index(
  { completedAt: 1 },
  { 
    expireAfterSeconds: 604800,
    partialFilterExpression: { completedAt: { $type: 'date' } }
  }
);
```
MongoDB's background TTL thread checks documents with a `completedAt` timestamp and deletes them 604,800 seconds (7 days) after `completedAt`.

---

## 📡 REST API Endpoint Documentation

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/google` | Verify Google ID token, upsert user & issue JWT | No |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Yes (JWT) |
| `GET` | `/api/orders` | List user orders (supports `search` & `status` query) | Yes (JWT) |
| `POST` | `/api/orders` | Create a new order | Yes (JWT) |
| `PUT` | `/api/orders/:id` | Update order details or status | Yes (JWT) |
| `POST` | `/api/orders/:id/settle` | Settle payment (set advancePaid = totalPrice) | Yes (JWT) |
| `DELETE` | `/api/orders/:id` | Permanently delete order | Yes (JWT) |
| `GET` | `/api/orders/export/csv` | Download active orders as CSV file | Yes (JWT) |
| `GET` | `/api/cron/cleanup` | Daily cron handler for 7-day completed order deletion | Cron Secret |

---

## 📄 License
MIT License. Created for production pharmacy management.
