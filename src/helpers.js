// Pure helper functions — no GitHub API dependencies
// Exported for unit testing

const COMMENT_MARKER = "<!-- ship-happens-audit -->";

const STATUS_EMOJI = {
  success: "✅",
  failure: "❌",
  cancelled: "⚠️",
};

const ENV_EMOJI = {
  production: "🔴",
  prod: "🔴",
  staging: "🟡",
  stage: "🟡",
  development: "🟢",
  dev: "🟢",
  preview: "🔵",
};

function getEnvEmoji(environment) {
  const key = environment.toLowerCase();
  return ENV_EMOJI[key] || "🚀";
}

function formatTimestamp() {
  return new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC";

}

function buildComment({ environment, status, actor, approver, runUrl, customMessage, repoUrl }) {
  const statusEmoji = STATUS_EMOJI[status] || "❓";
  const envEmoji = getEnvEmoji(environment);
  const timestamp = formatTimestamp();

  const approverLine = approver
    ? `| 👤 **Approved by** | @${approver} |`
    : `| 👤 **Approved by** | _(no approval required or token lacks permissions)_ |`;

  const customLine = customMessage
    ? `| 💬 **Note** | ${customMessage} |`
    : "";

  return `${COMMENT_MARKER}
<details open>
<summary><strong>🚢 Ship Happens — Deployment Record</strong></summary>

| | |
|---|---|
| ${envEmoji} **Environment** | \`${environment}\` |
| ${statusEmoji} **Status** | ${status} |
| 🙋 **Triggered by** | @${actor} |
${approverLine}
| 🕐 **Timestamp** | ${timestamp} |
| 🔗 **Run** | [View workflow run →](${runUrl}) |
${customLine}

</details>

---
<sub>Stamped by [Ship Happens](${repoUrl}) 🚢 — because ship happens.</sub>`;
}

module.exports = { buildComment, getEnvEmoji, formatTimestamp, COMMENT_MARKER };
