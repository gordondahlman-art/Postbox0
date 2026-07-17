const express = require("express");
const path = require("path");

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Simple shared-passcode gate so a public URL can't be used by strangers
// to send mail through YOUR Brevo account. Set APP_PASSWORD when you deploy.
const APP_PASSWORD = process.env.APP_PASSWORD || "";

function requirePasscode(req, res, next) {
  if (!APP_PASSWORD) return next(); // no passcode configured, skip
  const supplied = req.header("x-app-password") || "";
  if (supplied !== APP_PASSWORD) {
    return res.status(401).json({ error: "Wrong passcode." });
  }
  next();
}

// Basic per-recipient personalization: replace {{name}} / {{email}}
function fillTemplate(str, data) {
  return str.replace(/{{\s*(\w+)\s*}}/g, (_, key) => (data[key] ?? ""));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

app.post("/api/send", requirePasscode, async (req, res) => {
  const {
    brevoApiKey,
    fromEmail,
    fromName,
    replyTo,
    subject,
    bodyHtml,
    recipients, // [{ email, name }]
  } = req.body || {};

  if (!brevoApiKey) {
    return res.status(400).json({ error: "Missing Brevo API key." });
  }
  if (!fromEmail || !subject || !bodyHtml) {
    return res.status(400).json({ error: "Missing from email, subject, or body." });
  }
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: "No recipients." });
  }
  if (recipients.length > 200) {
    return res.status(400).json({ error: "Limit is 200 recipients per send." });
  }

  // Stream results back as newline-delimited JSON so the UI can show
  // live progress instead of waiting for all sends to finish.
  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Transfer-Encoding", "chunked");

  let sent = 0;
  let failed = 0;

  for (const r of recipients) {
    const to = (r.email || "").trim();
    if (!to) continue;
    const personalized = { email: to, name: r.name || "" };

    try {
      const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": brevoApiKey,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          sender: { email: fromEmail, name: fromName || undefined },
          to: [{ email: to, name: r.name || undefined }],
          replyTo: { email: replyTo || fromEmail },
          subject: fillTemplate(subject, personalized),
          htmlContent: fillTemplate(bodyHtml, personalized),
        }),
      });

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        throw new Error(errBody.message || `Brevo error (HTTP ${resp.status})`);
      }

      sent++;
      res.write(JSON.stringify({ to, status: "sent", sent, failed, total: recipients.length }) + "\n");
    } catch (err) {
      failed++;
      res.write(JSON.stringify({ to, status: "failed", error: err.message, sent, failed, total: recipients.length }) + "\n");
    }

    // Small delay between sends to stay well under Brevo's rate limits.
    await sleep(400);
  }

  res.end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Mail sender running on port ${PORT}`);
  if (!APP_PASSWORD) {
    console.log("WARNING: no APP_PASSWORD set — anyone with the URL can send mail through your Brevo account.");
  }
});
