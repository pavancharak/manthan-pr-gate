import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function getAISuggestions(files) {
  try {
    // 🔥 Build diff (limit size)
    const diff = files
      .map(f => f.patch || "")
      .join("\n")
      .slice(0, 8000);

    // 🔥 Strict prompt (very important)
    const prompt = `
Analyze this GitHub PR diff.

Return ONLY valid JSON:
{
  "authRisk": boolean,
  "paymentRisk": boolean,
  "securityRisk": boolean
}

Do not explain anything. Only JSON.

Diff:
${diff}
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You analyze code diffs." },
        { role: "user", content: prompt }
      ],
      temperature: 0
    });

    const text = response.choices[0].message.content;

    // 🔥 Safe parse
    return JSON.parse(text);
  } catch (err) {
    console.error("AI error:", err.message);
    return {};
  }
}