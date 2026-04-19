import express from "express";
import crypto from "crypto";
import { handlePRWebhook } from "./handlers/pr.js";

const app = express();

// ✅ Capture raw body for signature verification
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

// 🔐 Verify GitHub webhook signature
function verifySignature(req) {
  const signature = req.headers["x-hub-signature-256"];

  if (!signature || !req.rawBody) return false;

  const expected =
    "sha256=" +
    crypto
      .createHmac("sha256", process.env.GITHUB_WEBHOOK_SECRET)
      .update(req.rawBody)
      .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// 🚀 Webhook endpoint
app.post("/webhook", (req, res) => {
  const event = req.headers["x-github-event"];

  console.log("📩 Webhook received:", event);

  // 🔐 Verify signature
  if (!verifySignature(req)) {
    console.log("❌ Invalid signature");
    return res.sendStatus(401);
  }

  // 🔥 Only handle pull_request events
  if (event !== "pull_request") {
    return res.sendStatus(200);
  }

  // ✅ Process PR
  handlePRWebhook(req, res);
});

// 🚀 Start server
app.listen(3000, "0.0.0.0", () => {
  console.log("🚀 PR Gate running");
});