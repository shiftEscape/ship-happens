# 🚢 Ship Happens

[![License](https://img.shields.io/github/license/shiftEscape/ship-happens)](LICENSE)
[![Issues](https://img.shields.io/github/issues/shiftEscape/ship-happens)](https://github.com/shiftEscape/ship-happens/issues)
[![Stars](https://img.shields.io/github/stars/shiftEscape/ship-happens)](https://github.com/shiftEscape/ship-happens/stargazers)

> **Because ship happens.**

Automatically stamps a deployment audit record directly on your Pull Request — environment, approver, timestamp, and run link. No more digging through Actions logs to answer "who deployed what, when, and who approved it?"

---

## What it looks like

When a deployment completes, Ship Happens posts this comment on the associated PR:

---

🚢 **Ship Happens — Deployment Record**

| | |
|---|---|
| 🔴 **Environment** | `production` |
| ✅ **Status** | success |
| 🙋 **Triggered by** | @shiftEscape |
| 👤 **Approved by** | @tech-lead |
| 🕐 **Timestamp** | 2026-04-22 08:43:11 UTC |
| 🔗 **Run** | [View workflow run →](https://github.com/...) |
| 💬 **Note** | Hotfix for login bug |

---

## Features

- **Automatic PR detection** — finds the open PR for the deployed branch, no config needed
- **Approver tracking** — captures who approved the environment protection rule
- **Commit fallback** — if no PR is open, stamps the commit directly
- **Smart updates** — updates the existing comment on re-deploys instead of spamming new ones
- **Status-aware** — records success, failure, and cancelled deployments
- **Environment emoji** — colour-coded environments at a glance (🔴 prod, 🟡 staging, 🟢 dev)
- **Custom notes** — attach a free-text message to the audit record

---

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `token` | ✅ | — | GitHub token. Use `GITHUB_TOKEN` for basic usage. Use a PAT with `repo` scope for approver detection. |
| `environment` | ✅ | — | The environment deployed to (e.g. `production`, `staging`). |
| `status` | ✅ | `success` | Deployment outcome: `success`, `failure`, or `cancelled`. Use `${{ job.status }}`. |
| `custom-message` | ❌ | `""` | Optional note appended to the audit comment. |
| `update-comment` | ❌ | `true` | Updates an existing Ship Happens comment instead of posting a new one. |
| `post-on-commit` | ❌ | `true` | Posts on the commit if no open PR is found for the branch. |

---

## Outputs

| Output | Description |
|---|---|
| `comment-id` | ID of the comment posted. |
| `pr-number` | PR number where the comment was posted. Empty if posted on a commit. |
| `approver` | GitHub login of the approver. Empty if no approval was required or token lacks permissions. |

---

## Approver detection

Ship Happens tries to fetch who approved the deployment via GitHub's environment protection rules API.

| Token type | Approver shown? |
|---|---|
| `GITHUB_TOKEN` | ⚠️ May not work — limited API permissions |
| PAT with `repo` scope | ✅ Full approver detection |

To use a PAT:
1. Create a personal access token with `repo` scope at [github.com/settings/tokens](https://github.com/settings/tokens)
2. Add it as a repository secret (e.g. `DEPLOY_TOKEN`)
3. Use `token: ${{ secrets.DEPLOY_TOKEN }}` in the action input

If the token lacks permissions, Ship Happens still runs — it just shows a fallback message for the approver field instead of failing.

---

## Examples

> Full example workflow files are available in [`docs/examples/`](docs/examples/).

### Basic usage

Add Ship Happens as the last step of your deployment job:

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # Required for approver detection

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Deploy
        run: echo "your deploy script here"

      - name: Stamp deployment record
        if: always()
        uses: shiftEscape/ship-happens@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          environment: production
          status: ${{ job.status }}
```

> **Note:** Use `if: always()` so Ship Happens runs even when the deployment fails — that's when the audit trail matters most.

### Multi-environment pipeline

```yaml
jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - run: echo "Deploy to staging"
      - uses: shiftEscape/ship-happens@v1
        if: always()
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          environment: staging
          status: ${{ job.status }}

  deploy-production:
    runs-on: ubuntu-latest
    environment: production
    needs: deploy-staging
    steps:
      - run: echo "Deploy to production"
      - uses: shiftEscape/ship-happens@v1
        if: always()
        with:
          token: ${{ secrets.DEPLOY_TOKEN }}
          environment: production
          status: ${{ job.status }}
          custom-message: "Promoted from staging after QA sign-off"
```

### Using outputs in subsequent steps

```yaml
- name: Stamp deployment record
  id: stamp
  uses: shiftEscape/ship-happens@v1
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    environment: production
    status: ${{ job.status }}

- name: Print audit info
  run: |
    echo "Comment ID : ${{ steps.stamp.outputs.comment-id }}"
    echo "PR Number  : ${{ steps.stamp.outputs.pr-number }}"
    echo "Approver   : ${{ steps.stamp.outputs.approver }}"
```

---

## License

MIT © [shiftEscape](https://github.com/shiftEscape)
