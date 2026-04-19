import express from "express";
import crypto from "crypto";
import { handlePRWebhook } from "./handlers/pr.js";

const app = express();

// ✅ Capture raw body
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

// 🔐 Verify GitHub signature
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

// 🚀 Secure webhook
app.post("/webhook", (req, res) => {
  if (!verifySignature(req)) {
    console.log("❌ Invalid signature");
    return res.sendStatus(401);
  }

  handlePRWebhook(req, res);
});

app.listen(3000, () => {
  console.log("🚀 PR Gate running");
});