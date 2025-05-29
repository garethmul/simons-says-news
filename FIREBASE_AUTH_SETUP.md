# Firebase Authentication Setup for Project Eden

## Overview
Project Eden now includes Firebase authentication to restrict access to authorized users only.

## Configuration

### 1. Firebase Project
The app is configured to use the Firebase project: `christian-360`

### 2. Authorized Users
To restrict access to specific email addresses, edit the `AUTHORIZED_EMAILS` array in `src/App.jsx`:

```javascript
const AUTHORIZED_EMAILS = [
  'admin@eden.co.uk',
  'content@eden.co.uk',
  'user@example.com',
  // Add more authorized emails as needed
];
```

If you leave the array empty, all authenticated Firebase users will be allowed access.

### 3. Authentication Flow
1. Users must sign in with email and password
2. Only users with email addresses in the `AUTHORIZED_EMAILS` list can access the dashboard
3. Users can reset their password via the "Forgot password?" link
4. Once authenticated, users can sign out using the "Sign Out" button in the header

## Creating User Accounts

### Using Firebase Console:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select the `christian-360` project
3. Navigate to Authentication > Users
4. Click "Add user"
5. Enter the email and password for the new user

### Using Firebase Admin SDK (programmatically):
```javascript
// Example code to create users programmatically
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const app = initializeApp();

// Create a new user
getAuth()
  .createUser({
    email: 'user@example.com',
    password: 'secretPassword123',
    displayName: 'User Name',
  })
  .then((userRecord) => {
    console.log('Successfully created new user:', userRecord.uid);
  })
  .catch((error) => {
    console.error('Error creating new user:', error);
  });
```

## Security Rules
Make sure your Firebase project has appropriate security rules set up in the Firebase Console under Authentication > Settings.

## Troubleshooting

### User can't sign in:
1. Check if the email is in the `AUTHORIZED_EMAILS` list
2. Verify the password is correct
3. Check Firebase Console for any authentication errors

### "Access Denied" after sign in:
This means the user's email is not in the authorized list. Add their email to `AUTHORIZED_EMAILS` in `src/App.jsx`.

### Password reset not working:
1. Check spam folder for reset email
2. Verify email configuration in Firebase Console
3. Make sure the email address exists in Firebase Authentication

## Environment Variables
No additional environment variables are needed for Firebase authentication as the configuration is hardcoded in `src/config/firebase.js`. However, for production environments, you may want to move the Firebase config to environment variables for better security. 