#!/usr/bin/env node

/**
 * Utility script to create Firebase users for Project Eden
 * 
 * Usage: node scripts/create-firebase-user.js <email> <password>
 * 
 * Note: This requires Firebase Admin SDK and appropriate credentials
 */

console.log(`
📌 To create Firebase users for Project Eden:

1. Use Firebase Console (Recommended):
   - Go to: https://console.firebase.google.com/
   - Select project: christian-360
   - Navigate to: Authentication > Users
   - Click "Add user"
   - Enter email and password

2. Authorized Emails:
   Remember to add the user's email to the AUTHORIZED_EMAILS array
   in src/App.jsx:

   const AUTHORIZED_EMAILS = [
     'admin@eden.co.uk',
     'content@eden.co.uk',
     '${process.argv[2] || 'new-user@example.com'}',
     // Add more authorized emails as needed
   ];

3. First-time setup:
   - Users can sign in at: http://localhost:5576
   - They can reset their password using "Forgot password?" link
   - Once logged in, they'll see their email in the header

For more information, see FIREBASE_AUTH_SETUP.md
`); 