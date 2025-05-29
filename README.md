# Simon's Says News

A modern, full-stack news application built with React and Node.js, featuring a beautiful UI and optimised development workflow.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development environment
npm run dev
```

Your application will be available at:
- **Frontend**: http://localhost:5576
- **Backend API**: http://localhost:3607

## 📋 Project Overview

Simon's Says News is a personalised news application built with modern web technologies. It features a React frontend with Tailwind CSS for styling, and a Node.js/Express backend with session management and CORS configuration.

### 🛠️ Technology Stack

**Frontend:**
- React 18 with Hooks
- React Router for navigation
- Vite for fast development and building
- Tailwind CSS for styling

**Backend:**
- Node.js with Express
- ES6 Modules
- Session management with express-session
- CORS configuration for cross-origin requests

**Development:**
- Hot Module Replacement (HMR)
- Automatic port management
- Unified development startup script
- Production-ready build process

## 📁 Project Structure

```
simons-says-news/
├── src/
│   ├── components/         # React components
│   ├── pages/             # React pages
│   ├── routes/            # Express API routes
│   ├── config/            # Configuration files
│   ├── utils/             # Utility functions
│   ├── services/          # Business logic services
│   ├── middleware/        # Express middleware
│   ├── models/            # Data models
│   ├── hooks/             # Custom React hooks
│   ├── assets/            # Static assets
│   ├── styles/            # CSS/styling files
│   └── scripts/           # Database migrations & scripts
├── public/                # Static files served by Vite
├── scripts/               # Development utilities
├── server.js              # Express server entry point
├── start-dev.js           # Development startup script
├── vite.config.js         # Vite configuration
├── ports.config.js        # Port configuration
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables
└── README.md              # This file
```

## 🔧 Configuration

### Port Configuration

This project uses randomly generated ports to avoid conflicts:
- **Frontend**: 5576
- **Backend**: 3607
- **HMR**: 5577

These ports are configured in `ports.config.js` and used throughout the application.

### Environment Variables

Copy the `.env` file and update the values for your environment:

```env
# Server Configuration
NODE_ENV=development
PORT=3607
SESSION_SECRET=dev-session-secret-change-in-production

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=simons_says_news

# Frontend Configuration
VITE_API_URL=/api
FRONTEND_URL=http://localhost:5576

# API Keys (add your keys here)
# VITE_OPENAI_API_KEY=your-openai-key
# NEWS_API_KEY=your-news-api-key
```

### Firebase Authentication

Project Eden uses Firebase Authentication to restrict access to authorized users only.

**Setup:**
1. Users must be created in Firebase Console (christian-360 project)
2. Add authorized email addresses to `AUTHORIZED_EMAILS` in `src/App.jsx`
3. Users sign in with email/password at the login screen

**Managing Users:**
```bash
# View user creation guide
node scripts/create-firebase-user.js

# Add emails to authorized list in src/App.jsx:
const AUTHORIZED_EMAILS = [
  'admin@eden.co.uk',
  'user@example.com',
  // Add more as needed
];
```

See `FIREBASE_AUTH_SETUP.md` for detailed authentication documentation.

## 📜 Available Scripts

### Core Development Scripts
```bash
npm run dev              # Start both frontend and backend with hot reloading
npm run restart          # Kill all processes and restart development environment
npm run kill-ports       # Kill processes on configured ports only
```

### Individual Server Scripts  
```bash
npm run server           # Start backend only with nodemon hot reloading
npm run client           # Start frontend only with Vite
```

### Production & Build Scripts
```bash
npm start                # Start production server (used by Heroku)
npm run build            # Build frontend for production
npm run preview          # Preview production build locally
```

### Utility Scripts
```bash
npm run health-check     # Check if both servers are running properly
npm run lint             # Run ESLint on codebase
```

## 🏗️ Development Workflow

### Starting Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   - Update `.env` with your database credentials and API keys
   - Ensure ports 5576, 3607, and 5577 are available

3. **Start development servers:**
   ```bash
   npm run dev
   ```

This will:
- Kill any existing processes on the configured ports
- Start the Express server on port 3607
- Start the Vite dev server on port 5576
- Set up proxy forwarding from frontend to backend
- Enable hot reloading for both frontend and backend

### Development Features

- **Hot Module Replacement**: Instant updates for React components without losing state
- **Backend Hot Reloading**: Automatic server restart when backend files change
- **Automatic Port Cleanup**: Prevents "port already in use" errors
- **Unified Startup**: Single command starts both servers
- **Health Monitoring**: Built-in health check endpoints

### Making Changes

- **Frontend changes**: Edit files in `src/components/`, `src/pages/`, etc.
- **Backend changes**: Edit files in `src/routes/`, `src/services/`, etc.
- **Styling**: Use Tailwind CSS classes or edit `src/index.css`

## 🚀 Deployment

### Heroku Deployment

This project is configured for easy Heroku deployment:

1. **Create Heroku app:**
   ```bash
   heroku create your-app-name
   ```

2. **Set environment variables:**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set SESSION_SECRET=your-production-secret
   # ... add other environment variables
   ```

3. **Deploy:**
   ```bash
   git push heroku main
   ```

The `Procfile` and `heroku-postbuild` script are already configured.

### Production Build

To build for production locally:

```bash
npm run build
npm run preview
```

## 🔍 Troubleshooting

### Common Issues

**Port conflicts:**
```bash
npm run kill-ports
npm run dev
```

**Environment variables not loading:**
- Ensure `.env` file exists in project root
- Restart development server after changing `.env`
- Use `VITE_` prefix for client-side variables

**Build issues:**
```bash
# Clear caches and reinstall
rm -rf node_modules dist .vite
npm install
npm run build
```

**Health check failures:**
```bash
npm run health-check
```

### Development Tips

- Use `npm run restart` for a clean restart of all servers
- Check `npm run health-check` if servers seem unresponsive
- Monitor the terminal output for error messages
- Ensure your database is running if using database features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly: `npm run dev` and `npm run build`
5. Commit your changes: `git commit -m 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues:

1. Check the troubleshooting section above
2. Run `npm run health-check` to diagnose server issues
3. Check the terminal output for error messages
4. Ensure all environment variables are properly configured

---

**Happy coding! 🎉** 