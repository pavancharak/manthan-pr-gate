export function verifySignals(files, ai) {
  const filenames = files.map(f => f.filename);

  return {
    touchesAuth:
      ai.suggestsAuthRisk &&
      filenames.some(f => f.includes("auth")),
  };
}