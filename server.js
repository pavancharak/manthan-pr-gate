import express from "express";
import { handlePRWebhook } from "./handlers/pr.js";

const app = express();
app.use(express.json());

app.post("/webhook", handlePRWebhook);

app.listen(3000, () => {
  console.log("🚀 PR Gate running");
});