import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const CORE_URL = "https://manthan-core-simple.fly.dev";

app.post("/webhook", async (req, res) => {
  try {
    const event = req.headers["x-github-event"];

    if (event !== "pull_request") return res.sendStatus(200);

    const pr = req.body.pull_request;

    const decisionInput = {
      intent: "pr_merge_safety",
      userInput: {
        prNumber: pr.number,
        repository: req.body.repository.full_name,
      },
      systemData: {
        isApproved: pr.mergeable_state === "clean",
        hasNewCommitsAfterApproval: false,
      },
    };

    const response = await axios.post(
      `${CORE_URL}/evaluate`,
      decisionInput
    );

    console.log("🔥 Decision:", response.data);

    res.sendStatus(200);
  } catch (err) {
    console.error(err.message);
    res.sendStatus(500);
  }
});

app.listen(3000, () => {
  console.log("🚀 PR Gate running on 3000");
});