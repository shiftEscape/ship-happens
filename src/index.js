const core = require("@actions/core");
const github = require("@actions/github");
const { buildComment, COMMENT_MARKER } = require("./helpers");

// ─── GitHub API helpers ───────────────────────────────────────────────────────

async function findPullRequest(octokit, owner, repo, branch) {
  try {
    const { data: prs } = await octokit.rest.pulls.list({
      owner,
      repo,
      state: "open",
      head: `${owner}:${branch}`,
      per_page: 1,
    });
    return prs.length > 0 ? prs[0] : null;
  } catch (err) {
    core.warning(`Could not fetch pull requests: ${err.message}`);
    return null;
  }
}

async function findApprover(octokit, owner, repo, runId) {
  try {
    // Use the reviews endpoint
    const response = await octokit.request(
      "GET /repos/{owner}/{repo}/actions/runs/{run_id}/approvals",
      { owner, repo, run_id: runId }
    );

    const approvals = response.data;
    if (approvals && approvals.length > 0) {
      // Return the most recent approver
      const latest = approvals[approvals.length - 1];
      return latest.user?.login || null;
    }
    return null;
  } catch (err) {
    core.warning(
      `Could not fetch approver — token may lack repo scope or no approval was required. (${err.message})`
    );
    return null;
  }
}

async function findExistingComment(octokit, owner, repo, prNumber) {
  try {
    const { data: comments } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber,
      per_page: 100,
    });
    return comments.find((c) => c.body && c.body.includes(COMMENT_MARKER)) || null;
  } catch (err) {
    core.warning(`Could not list PR comments: ${err.message}`);
    return null;
  }
}

async function postOrUpdatePRComment(octokit, owner, repo, prNumber, body, updateExisting) {
  if (updateExisting) {
    const existing = await findExistingComment(octokit, owner, repo, prNumber);
    if (existing) {
      const { data } = await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existing.id,
        body,
      });
      core.info(`Updated existing Ship Happens comment: ${data.html_url}`);
      return data.id;
    }
  }

  const { data } = await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body,
  });
  core.info(`Posted Ship Happens comment on PR #${prNumber}: ${data.html_url}`);
  return data.id;
}

async function postCommitComment(octokit, owner, repo, sha, body) {
  const { data } = await octokit.rest.repos.createCommitComment({
    owner,
    repo,
    commit_sha: sha,
    body,
  });
  core.info(`Posted Ship Happens comment on commit ${sha}: ${data.html_url}`);
  return data.id;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  try {
    // Read inputs
    const token = core.getInput("token", { required: true });
    const environment = core.getInput("environment", { required: true });
    const status = core.getInput("status") || "success";
    const customMessage = core.getInput("custom-message") || "";
    const updateComment = core.getInput("update-comment") === "true";
    const postOnCommit = core.getInput("post-on-commit") === "true";

    // GitHub context
    const { context } = github;
    const octokit = github.getOctokit(token);
    const { owner, repo } = context.repo;
    const runId = context.runId;
    const actor = context.actor;
    const sha = context.sha;
    const branch = context.ref.replace("refs/heads/", "");
    const runUrl = `https://github.com/${owner}/${repo}/actions/runs/${runId}`;
    const repoUrl = `https://github.com/shiftEscape/ship-happens`;

    core.info(`🚢 Ship Happens starting...`);
    core.info(`   Environment : ${environment}`);
    core.info(`   Status      : ${status}`);
    core.info(`   Branch      : ${branch}`);
    core.info(`   Actor       : ${actor}`);

    // Try to find approver
    const approver = await findApprover(octokit, owner, repo, runId);
    if (approver) {
      core.info(`   Approver    : ${approver}`);
    }

    // Build the comment body
    const commentBody = buildComment({
      environment,
      status,
      actor,
      approver,
      runUrl,
      customMessage,
      repoUrl,
    });

    // Try to find an associated PR
    const pr = await findPullRequest(octokit, owner, repo, branch);

    let commentId = null;
    let prNumber = null;

    if (pr) {
      prNumber = pr.number;
      core.info(`   PR found    : #${prNumber}`);
      commentId = await postOrUpdatePRComment(
        octokit,
        owner,
        repo,
        prNumber,
        commentBody,
        updateComment
      );
    } else if (postOnCommit) {
      core.info(`   No open PR found for branch '${branch}'. Posting on commit ${sha}.`);
      commentId = await postCommitComment(octokit, owner, repo, sha, commentBody);
    } else {
      core.warning(
        `No open PR found for branch '${branch}' and post-on-commit is false. Nothing posted.`
      );
    }

    // Set outputs
    core.setOutput("comment-id", commentId ? String(commentId) : "");
    core.setOutput("pr-number", prNumber ? String(prNumber) : "");
    core.setOutput("approver", approver || "");

    core.info(`✅ Ship Happens done.`);
  } catch (err) {
    core.setFailed(`Ship Happens failed: ${err.message}`);
  }
}

run();
