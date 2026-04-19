import express from "express";
import axios from "axios";
import jwt from "jsonwebtoken";

const app = express();
app.use(express.json());

const CORE_URL = "https://manthan-core-simple.fly.dev";

/**
 * 🔐 Decode Base64 private key
 */
function getPrivateKey() {
  const base64 = process.env.GITHUB_PRIVATE_KEY_BASE64;
  return Buffer.from(base64, "base64").toString("utf-8");
}

/**
 * 🔐 Generate GitHub App JWT
 */
function generateJWT() {
  return jwt.sign(
    {
      iat: Math.floor(Date.now() / 1000) - 60,
      exp: Math.floor(Date.now() / 1000) + (10 * 60),
      iss: process.env.GITHUB_APP_ID,
    },
    getPrivateKey(),
    { algorithm: "RS256" }
  );
}

/**
 * 🔑 Get installation access token
 */
async function getInstallationToken(installationId) {
  const jwtToken = generateJWT();

  const res = await axios.post(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {},
    {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  return res.data.token;
}

/**
 * 🚀 Webhook handler
 */
app.post("/webhook", async (req, res) => {
  try {
    const event = req.headers["x-github-event"];
    if (event !== "pull_request") return res.sendStatus(200);

    const pr = req.body.pull_request;
    const owner = req.body.repository.owner.login;
    const repo = req.body.repository.name;

    const installationId = req.body.installation?.id || process.env.GITHUB_INSTALLATION_ID;

    // 🔐 Get GitHub token
    const token = await getInstallationToken(installationId);

    /**
     * 🧠 Signals (deterministic only)
     */
    const decisionInput = {
      intent: "pr_merge_safety",
      userInput: {
        prNumber: pr.number,
        repository: req.body.repository.full_name,
      },
      systemData: {
        isApproved: pr.mergeable_state === "clean",
        hasNewCommitsAfterApproval: false,
        linesChanged: pr.additions + pr.deletions,
        isDraft: pr.draft,
      },
    };

    /**
     * 🔍 Call Manthan Core
     */
    const response = await axios.post(
      `${CORE_URL}/evaluate`,
      decisionInput
    );

    const decision = response.data;
    console.log("🔥 Decision:", decision);

    /**
     * 💬 Comment on PR
     */
    await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/issues/${pr.number}/comments`,
      {
        body: `🤖 **Manthan Decision**

\`\`\`json
${JSON.stringify(decision, null, 2)}
\`\`\`
`,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    /**
     * ✅ Status check (ENFORCEMENT)
     */
    await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/statuses/${pr.head.sha}`,
      {
        state: decision.outcome === "ALLOW" ? "success" : "failure",
        context: "manthan/pr-decision",
        description: `Decision: ${decision.outcome}`,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Error:", err.response?.data || err.message);
    res.sendStatus(500);
  }
});

/**
 * 🟢 Health check
 */
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "manthan-pr-gate" });
});

app.listen(3000, () => {
  console.log("🚀 PR Gate running on 3000");
});