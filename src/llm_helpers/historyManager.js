export function getCompressedHistory(messages, options = {}) {
  const windowSize = Number.isInteger(options.windowSize) ? options.windowSize : 12;
  const maxChars = Number.isInteger(options.maxChars) ? options.maxChars : 4000;

  const recent = messages.slice(-windowSize);
  const earlier = messages.slice(0, Math.max(0, messages.length - windowSize));

  const recentBlock = recent.map(m => `<${m.speaker}>: ${m.content}`).join('\n');

  // Extremely light “summary” by sampling older messages
  const sampled = [];
  const step = Math.ceil(Math.max(1, earlier.length / 6));
  for (let i = 0; i < earlier.length; i += step) {
    const m = earlier[i];
    if (!m) continue;
    const line = `${m.speaker}: ${m.content}`.trim().replace(/\s+/g, ' ');
    sampled.push(`- ${line.slice(0, 180)}`);
  }
  const earlierBlock = sampled.length ? [`[Earlier Summary]`, ...sampled].join('\n') : '';

  let out = earlierBlock ? `${earlierBlock}\n\n[Recent]\n${recentBlock}` : recentBlock;
  if (out.length > maxChars) {
    out = out.slice(out.length - maxChars);
  }
  return out;
}