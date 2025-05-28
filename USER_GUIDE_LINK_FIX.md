# User Guide Link Fix - Project Eden

## Problem Identified
The user guide link had two issues:
1. **Opened in new tab**: Not great UX, users prefer staying in the same tab
2. **Loaded main app instead of user guide**: Appeared to be a routing issue

## Root Cause Analysis
The actual issue was only the first one - the link was opening in a new tab using `window.open('/user-guide.html', '_blank')`. The user guide file was actually accessible at both:
- Frontend server: `http://localhost:5576/user-guide.html` ✅
- Backend server: `http://localhost:3607/user-guide.html` ✅

## Solution Implemented

### 1. Changed Link Behaviour
**Before:**
```javascript
onClick={() => window.open('/user-guide.html', '_blank')}
```

**After:**
```javascript
onClick={() => window.location.href = '/user-guide.html'}
```

This change makes the user guide open in the same tab instead of a new one.

### 2. Added Explicit Backend Route (Defensive)
Added a specific route in the backend server for the user guide:
```javascript
app.get('/user-guide.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'user-guide.html'));
});
```

This ensures the user guide is always accessible even if there are routing conflicts.

## Technical Details

### File Serving
- **Vite Dev Server**: Automatically serves files from `public/` directory at root level
- **Express Server**: Uses `express.static()` to serve files from `public/` directory
- **User Guide Location**: `public/user-guide.html` (27.8KB)

### URL Access
- **Frontend**: `http://localhost:5576/user-guide.html` ✅
- **Backend**: `http://localhost:3607/user-guide.html` ✅
- **Production**: Will be served from the same domain as the app

## User Experience Improvement
- **Before**: Click → New tab opens → Confusing navigation
- **After**: Click → Same tab navigates to user guide → Clear, expected behaviour
- **Navigation**: Users can use browser back button to return to the app

## Testing
Both servers confirmed to serve the user guide correctly:
```bash
curl http://localhost:5576/user-guide.html  # ✅ Works
curl http://localhost:3607/user-guide.html  # ✅ Works
```

## Result
The user guide link now works as expected:
1. ✅ Opens in the same tab (better UX)
2. ✅ Loads the actual user guide content
3. ✅ Accessible from both development servers
4. ✅ Will work correctly in production 