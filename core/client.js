import axios from "axios";

const CORE_URL = "https://manthan-core-simple.fly.dev";

export async function evaluateDecision(input) {
  const res = await axios.post(`${CORE_URL}/evaluate`, input);
  return res.data;
}