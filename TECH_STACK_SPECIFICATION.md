# 🚀 Tech Stack Specification for Simon's Says News

## 📋 **Project Overview**
- **Project Name:** Simon's Says News
- **Type:** Full-stack React/Node.js News Application
- **Deployment:** Heroku (simons-says-news)
- **Repository:** https://github.com/garethmul/simons-says-news

---

## 🛠️ **Core Technology Stack**

### **Frontend**
- **Framework:** React 18 with hooks
- **Build Tool:** Vite (fast development & build)
- **Styling:** Tailwind CSS
- **Routing:** React Router DOM v7
- **Development Port:** 5576
- **Production:** Served from `/dist` via Express

### **Backend**
- **Runtime:** Node.js (>=18.0.0)
- **Framework:** Express.js
- **Development Port:** 3607
- **Production Port:** Heroku assigned (via PORT env var)
- **Session Management:** express-session
- **CORS:** Configured for development and production

### **Database**
- **Type:** MySQL (NOT PostgreSQL)
- **Package:** mysql2 (with SSL support)
- **Host:** Available in .env
- **Port:** Available in .env
- **Database:** Available in .env
- **SSL:** Configured with certificate
- **Connection:** Use provided credentials in .env

---

## 🔌 **Available API Integrations**

### **AI & Content Generation**
```javascript
// OpenAI Integration
OPENAI_API_KEY=process.env.OPENAI_API_KEY           // ✅ Configured
OPENAI_IMAGE_API_KEY=process.env.OPENAI_IMAGE_API_KEY // ✅ Configured

// Google Gemini Integration
GEMINI_API_KEY=process.env.GEMINI_API_KEY           // ✅ Configured
GEMINI_MODEL=gemini-2.5-flash-preview-05-20        // Model specified
MAX_OUTPUT_TOKENS=32000                             // Token limit set
```

### **Media & Image Services**
```javascript
// Sirv CDN (Image Hosting & Optimization)
SIRV_CLIENT_ID=process.env.SIRV_CLIENT_ID           // ✅ Configured
SIRV_CLIENT_SECRET=process.env.SIRV_CLIENT_SECRET   // ✅ Configured
SIRV_PUBLIC_URL=https://staticimages.eden.co.uk     // CDN URL

// Pexels Stock Photography
PEXELS_API_KEY=process.env.PEXELS_API_KEY           // ✅ Configured

// YouTube API
YOUTUBE_API_KEY=process.env.YOUTUBE_API_KEY         // ✅ Configured
```

### **Brand & Content Data**
```javascript
// Brandfetch (Brand/Logo Data)
BRANDFETCH_API_KEY=process.env.BRANDFETCH_API_KEY   // ✅ Configured

// ISBN Database (Book Information)
ISBNDB_COM_API_KEY=process.env.ISBNDB_COM_API_KEY   // ✅ Configured

// Podcast Index
PODCASTINDEX_API_KEY=process.env.PODCASTINDEX_API_KEY // ✅ Configured
```

### **Maps & Location**
```javascript
// Google Maps
GOOGLE_MAPS_API_KEY=process.env.GOOGLE_MAPS_API_KEY // ✅ Configured
```

### **CRM & Communications**
```javascript
// Freshsales CRM Integration
FRESHSALES_API_KEY=process.env.FRESHSALES_API_KEY                           // ✅ Configured
FRESHSALES_TRANSACTIONAL_API_KEY=process.env.FRESHSALES_TRANSACTIONAL_API_KEY // ✅ Configured
FRESHSALES_DOMAIN=edenecommerce.myfreshworks.com                            // Domain specified
FRESHSALES_INVITATION_TEMPLATE_ID=process.env.FRESHSALES_INVITATION_TEMPLATE_ID     // ✅ Configured
FRESHSALES_PASSWORD_RESET_TEMPLATE_ID=process.env.FRESHSALES_PASSWORD_RESET_TEMPLATE_ID // ✅ Configured
```

---

## 💾 **Database Configuration**

### **Connection Setup**
```javascript
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST,           // ✅ Configured in .env
  port: process.env.DB_PORT,           // ✅ Configured in .env
  user: process.env.DB_USER,           // ✅ Configured in .env
  password: process.env.DB_PASSWORD,   // ✅ Configured in .env
  database: process.env.DB_NAME,       // ✅ Configured in .env
  ssl: {
    ca: process.env.MYSQL_SSL_CA       // ✅ SSL certificate provided
  },
  timezone: 'Z',
  dateStrings: true
};

const connection = await mysql.createConnection(dbConfig);
```

### **Required Package**
```bash
npm install mysql2
```

---

## 🏗️ **Project Structure**

```
simons-says-news/
├── index.html              # Vite entry point (PROJECT ROOT)
├── package.json            # Dependencies & scripts
├── .env                    # Environment variables (all APIs configured)
├── server.js               # Express server
├── ports.config.js         # Port configuration
├── src/
│   ├── main.jsx            # React entry point
│   ├── App.jsx             # Main React component
│   ├── components/         # React components
│   ├── pages/              # React pages
│   ├── routes/             # Express API routes
│   ├── models/             # Database models
│   ├── services/           # Business logic
│   └── utils/              # Utility functions
├── public/                 # Static assets
└── scripts/                # Development utilities
```

---

## 🚀 **Development Commands**

```bash
# Development
npm run dev              # Start both frontend (5576) & backend (3607)
npm run health-check     # Verify both servers are healthy

# Database
# Use mysql2 package with SSL configuration provided

# Deployment
# Automatic deployment via GitHub → Heroku
# Push to main branch triggers deployment
```

---

## 🔧 **Environment Configuration**

### **Development Ports**
- **Frontend:** http://localhost:5576
- **Backend:** http://localhost:3607
- **API Proxy:** `/api` routes proxy to backend

### **Production**
- **App URL:** https://simons-says-news-16a7f0a776c4.herokuapp.com
- **Database:** MySQL with SSL (credentials provided)
- **Static Files:** Served from `/dist`

---

## ⚠️ **Important Notes**

### **Database**
- ✅ **Use MySQL** (mysql2 package)
- ❌ **NOT PostgreSQL**
- ✅ SSL certificate configured
- ✅ Connection credentials provided in .env

### **API Keys**
- ✅ All major APIs pre-configured in .env
- ✅ OpenAI + Gemini for AI features
- ✅ Image services (Sirv, Pexels)
- ✅ CRM integration (Freshsales)
- ✅ Content APIs (YouTube, Podcast, ISBN)

### **Deployment**
- ✅ Heroku app created and configured
- ✅ GitHub integration enabled
- ✅ Environment variables set on Heroku
- ✅ Automatic deployment on push to main

### **File Locations**
- ✅ `index.html` in project root (NOT public/)
- ✅ API routes in `src/routes/`
- ✅ Database models in `src/models/`

---

## 🎯 **Development Guidelines**

1. **Database:** Use MySQL with provided SSL configuration
2. **APIs:** Leverage pre-configured integrations (OpenAI, Gemini, etc.)
3. **Images:** Use Sirv CDN for optimized image delivery
4. **Deployment:** Push to GitHub main branch for automatic Heroku deployment
5. **Structure:** Follow existing project structure
6. **Ports:** Use configured ports (5576 frontend, 3607 backend)
7. **Environment:** All API keys and secrets are configured in .env file

---

**🚀 Ready to build! All infrastructure and integrations are configured and operational.** 