#!/usr/bin/env bash
# PreToolUse(Agent): refuse a spawn that names no subagent_type or whose brief carries no call budget.
set -u
node -e '
let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
  const { subagent_type: type, prompt = "" } = JSON.parse(s).tool_input ?? {};
  if (type === "fork") return;
  const why = [];
  if (!type) why.push("name subagent_type: Explore for a search or a read-only survey, general-purpose otherwise");
  if (!/Budget: \d+ tool calls/.test(prompt)) why.push("end the prompt with \"Budget: <n> tool calls\" (a search fits in 15, an implementer in 40)");
  if (why.length) { process.stderr.write("Agent spawn refused: " + why.join("; ") + ".\n"); process.exit(2); }
});'
