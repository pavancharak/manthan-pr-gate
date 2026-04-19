import { getInstallationToken } from "../github/auth.js";
import { getPRFiles, commentOnPR, setStatus } from "../github/client.js";
import { extractSignals } from "../signals/extract.js";
import { getAISuggestions } from "../ai/advisory.js";
import { verifySignals } from "../signals/verify.js";
import { evaluateDecision } from "../core/client.js";

export async function handlePRWebhook(req, res) {
  try {
    const pr = req.body.pull_request;
    const owner = req.body.repository.owner.login;
    const repo = req.body.repository.name;

    const token = await getInstallationToken(req.body.installation.id);

    const files = await getPRFiles(owner, repo, pr.number, token);

    const base = extractSignals(files);
    const ai = await getAISuggestions(files);
    const verified = verifySignals(files, ai);

    const decision = await evaluateDecision({
      intent: "pr_merge_safety",
      userInput: {
        prNumber: pr.number,
        repository: req.body.repository.full_name,
      },
      systemData: {
        ...base,
        ...verified,
      },
    });

    await commentOnPR(owner, repo, pr.number, token, JSON.stringify(decision, null, 2));
    await setStatus(owner, repo, pr.head.sha, token, decision.outcome);

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
}