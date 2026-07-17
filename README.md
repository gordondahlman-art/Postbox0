# Postbox — a personal bulk email sender (Brevo API)

A tiny web app: enter your Brevo API key, sender name/email, reply-to,
subject, body, and up to 200 recipients, and it sends them one by one with
live progress. Open it in Safari on your iPhone like any website.

It has two parts:
- `server.js` — a small Node backend that calls Brevo's email API
- `public/index.html` — the page you open on your phone

You need to put the backend somewhere reachable by a URL. Free options below.

## Why Brevo instead of raw SMTP

Free hosting tiers (Render, Railway, Heroku, etc.) commonly block outbound
SMTP ports (25, 465, 587) to stop their platforms being used for spam — so a
direct Gmail/Outlook SMTP connection will time out on them. Brevo's API runs
over plain HTTPS (port 443), the same port your web page already uses, so it
isn't blocked. Brevo's free tier covers 300 emails/day, plenty for this.

## 1. Set up Brevo (~5 minutes)

1. Create a free account at brevo.com.
2. Go to **Senders, Domains & Dedicated IPs → Senders** and add your Gmail
   address (or whichever address you want to send from) as a sender. Brevo
   emails you a verification link — click it. No custom domain needed.
3. Go to **Settings → SMTP & API → API Keys** → **Generate a new API key**.
   Copy it somewhere safe — you'll paste it into the app, not save it in code.

## 2. Deploy the backend (one-time)

**Render.com (recommended, free tier):**
1. Create a free account at render.com.
2. Push this folder to a GitHub repo.
3. New → Web Service → connect the repo.
4. Build command: `npm install`   Start command: `npm start`
5. Add an environment variable: `APP_PASSWORD` = a passcode you make up.
   This is required — without it, anyone who finds your URL could send mail
   through your Brevo account.
6. Deploy. Render gives you a URL like `https://postbox-yourname.onrender.com`.

Railway.app and Fly.io work the same way if you prefer those.

Note: Render's free tier sleeps after inactivity, so the first open after a
while takes ~30 seconds to wake up — normal, just wait.

## 3. Use it on your iPhone

1. Open the Render URL in Safari.
2. Enter the passcode you set as `APP_PASSWORD`.
3. Paste in your Brevo API key.
4. Fill in sender name, sender email (must match the address you verified
   in Brevo), reply-to.
5. Write your subject and message. Use `{{name}}` and `{{email}}` to
   personalize each email.
6. Paste recipients, one per line: `email, name` (name optional).
7. Tap **Send** and watch live progress.

Tip: tap Share → **Add to Home Screen** in Safari so it opens like an app.

Everything except the Brevo API key is saved in the browser's local storage
on your phone, not on the server. The API key is intentionally never saved —
you re-enter it each time you send, so it's never sitting in storage
anywhere if your phone is lost or shared.

## Good to know

- The 400ms pause between sends keeps you comfortably under Brevo's rate
  limits on the free plan.
- Only send to people who've actually agreed to hear from you, and make it
  obvious how to opt out — that's both good practice and required by
  CAN-SPAM/GDPR-style rules depending on where your recipients are.
- This tool doesn't store your recipient lists or message history anywhere;
  it sends and forgets.
- If you outgrow the 300/day free tier, Brevo's paid plans scale up without
  any code changes here.
