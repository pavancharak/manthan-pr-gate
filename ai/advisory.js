export async function getAISuggestions(files) {
  const diff = files.map(f => f.patch).join("\n");

  return {
    suggestsAuthRisk: diff.includes("auth"),
  };
}