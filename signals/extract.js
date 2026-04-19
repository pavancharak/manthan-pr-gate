export function extractSignals(files) {
  const filenames = files.map(f => f.filename);

  return {
    touchesAuth: filenames.some(f => f.includes("auth")),
    touchesPayments: filenames.some(f => f.includes("billing")),
    largeChange: files.reduce((sum, f) => sum + f.additions + f.deletions, 0) > 500,
  };
}