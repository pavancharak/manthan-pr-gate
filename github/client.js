import axios from "axios";

export async function getPRFiles(owner, repo, prNumber, token) {
  const res = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return res.data;
}

export async function commentOnPR(owner, repo, prNumber, token, body) {
  return axios.post(
    `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    { body },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export async function setStatus(owner, repo, sha, token, outcome) {
  return axios.post(
    `https://api.github.com/repos/${owner}/${repo}/statuses/${sha}`,
    {
      state: outcome === "ALLOW" ? "success" : "failure",
      context: "manthan/pr-decision",
      description: `Decision: ${outcome}`,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}