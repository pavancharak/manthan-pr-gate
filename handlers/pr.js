import { getInstallationToken } from "../github/auth.js";
import { getPRFiles, commentOnPR, setStatus } from "../github/client.js";
import { extractSignals } from "../signals/extract.js";
import { getAISuggestions } from "../ai/advisory.js";
import { verifySignals } from "../signals/verify.js";
import { evaluateDecision } from "../core/client.js";

export async function handlePRWebhook(req, res) {
  try {
    // 🛑 SAFETY: ensure valid PR payload
    if (!req.body || !req.body.pull_request) {
      console.log("⏭️ Skipping non-PR event");
      return res.sendStatus(200);
    }

    const pr = req.body.pull_request;
    const owner = req.body.repository?.owner?.login;
    const repo = req.body.repository?.name;
    const installationId = req.body.installation?.id;

    // 🛑 Validate required fields
    if (!owner || !repo || !installationId) {
      console.log("❌ Missing required GitHub data");
      return res.sendStatus(200);
    }

    console.log(`🔍 Processing PR #${pr.number} in ${owner}/${repo}`);

    // 🔐 Get installation token
    const token = await getInstallationToken(installationId);

    // 📂 Fetch PR files
    const files = await getPRFiles(owner, repo, pr.number, token);
    console.log("📂 Files changed:", files.length);

    // ⚙️ Deterministic signal extraction
    const base = extractSignals(files);

    // 🤖 AI advisory (non-decision)
    const ai = await getAISuggestions(files);

    // ✅ Deterministic verification (truth boundary)
    const verified = verifySignals(files, ai);

    // 🧠 Build decision input
    const decisionInput = {
      intent: "pr_merge_safety",
      userInput: {
        prNumber: pr.number,
        repository: req.body.repository.full_name,
      },
      systemData: {
        ...base,
        ...verified,
      },
    };

    console.log("🧠 Decision Input:", JSON.stringify(decisionInput, null, 2));

    // 🚀 Evaluate decision
    const decision = await evaluateDecision(decisionInput);

    // 🛑 Validate decision
    if (!decision || !decision.outcome) {
      console.log("❌ Invalid decision response");
      return res.sendStatus(500);
    }

    console.log("🔥 Decision:", decision);

    // 💬 Comment on PR
    await commentOnPR(
      owner,
      repo,
      pr.number,
      token,
      `### 🧠 Manthan Decision\n\`\`\`json\n${JSON.stringify(
        decision,
        null,
        2
      )}\n\`\`\``
    );

    // 🔄 Map decision → GitHub status
    const statusMap = {
      ALLOW: "success",
      BLOCK: "failure",
      ESCALATE: "pending",
      REJECT: "failure",
    };

    // ✅ Set commit status
    await setStatus(
      owner,
      repo,
      pr.head.sha,
      token,
      statusMap[decision.outcome] || "failure"
    );

    return res.sendStatus(200);
  } catch (err) {
    console.error("🔥 ERROR:", err);
    return res.sendStatus(500);
  }
}