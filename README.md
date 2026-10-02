# Real Pay Frontend

This frontend connects to the Real Pay PostgreSQL backend.

## Configure
Open `assets/app.js` and change:
`const API = localStorage.getItem("REAL_PAY_API") || "http://localhost:3000";`

For a deployed API, either replace the default URL or run in the browser console:
`localStorage.setItem("REAL_PAY_API","https://YOUR-API.onrender.com");`
then reload.

## Deploy
Upload this folder as a static site on a hosting provider. Set the backend `CORS_ORIGIN` to the exact frontend URL.

## Important
This UI does not claim that a withdrawal has been paid. The backend only records requests until a legitimate payout process is connected.
Do not collect passwords, OTPs, PINs, or bank-card details through this frontend.
