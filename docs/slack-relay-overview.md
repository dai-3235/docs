# slack-relay overview

`slack-relay` is a Claude Code plugin that lets you drive a Claude Code session on your own machine from your phone, through a Slack app. You message the app a task, the agent does it on the machine, and the result comes back as a Slack message. Source: `https://github.com/dai-3235/skills/tree/main/slack-relay` (marketplace `fred-skills`, version 1.0.0).

Sections marked **TBD** need facts that are not in the source code. They are listed under [Open questions](#open-questions) and must not be filled with guesses.

## Why we need it

Agent sessions are most useful when they run for a long time, but they stall at the moments they need a human: a decision, an approval, a clarification. If you are away from the machine, the session waits until you are back. A phone is always with you, and Slack already gives a push notification per message, so the relay turns "come back to the terminal" into "answer a message".

## How it works

```
Phone (Slack app) <--HTTPS--> slack.com <--HTTPS polling--> Mac: slack.py <-> Claude Code session
```

- **No public server.** The Mac polls Slack's Web API over HTTPS (`conversations.history` / `conversations.replies`, every 4 s by default). Nothing listens on a port, so no tunnel or firewall change is needed.
- **A Slack app with a bot user** (manifest: `slack-app-manifest.json`). Because it is a separate account, the phone gets a real push notification for each agent message.
- **`scripts/slack.py`** is the only code that talks to Slack. Commands: `whoami`, `discover`, `send`, `wait`. It uses only the Python standard library, retries on rate limits, and treats auth errors as fatal.
- **Two skills** drive it:
  - `slack-relay:dispatch`: a loop. It runs `wait` in the background, picks up each message as a task, acknowledges it, works in the matching workspace, and reports the result. Plain words `status`, `cancel` and `stop` control it.
  - `slack-relay:ask`: a one-off question. It sends a decision message and waits for the reply. Waiting happens inside the script, so it costs no tokens.
- **`bin/relay-on <hours> [catch-up]`** checks Slack, runs `caffeinate`, and starts Claude Code with the dispatch skill for that many hours.

### Guardrails (as implemented)

- Only senders in `user_ids` are obeyed. Everyone else is dropped by the script before the agent sees the message. Bot messages and non-standard message subtypes are dropped too.
- Replies are sent only to allowlisted channels or DMs.
- Tasks run only inside the directories listed under `workspaces` in the config.
- Push to shared branches, deletes, deploys, spending money and system changes need an explicit yes in Slack. Silence is never approval, and after 4 hours without an answer the task is parked.
- Messages older than 15 minutes (for example after a restart with catch-up) need confirmation before they run.

## How it is installed

Short version. The full step-by-step is in [`slack-relay-local-setup.md`](slack-relay-local-setup.md).

1. `claude plugin marketplace add dai-3235/skills`, then `claude plugin install slack-relay@fred-skills`.
2. Create the Slack app from the manifest, install it to the workspace, copy the bot token.
3. Write `~/.config/slack-relay/config.json` (mode 600) with the token, your member ID and the workspaces.
4. Run `relay-on <hours>`, or use the launchd and `screen` setup for a permanent run.

## What problems it solves

- Sessions no longer block while you are away from the terminal: decisions and approvals are one message away.
- Short tasks (a fix, a test run, a doc edit, a research question) can be handed off from anywhere.
- No infrastructure: no server, domain, tunnel or webhook.
- A clear approval trail for risky actions, because they are asked and answered in the Slack history.

## Limits and risks

- The machine must stay awake and online. If Slack is unreachable the loop retries, then stops.
- Text only. Files and images are ignored.
- A Slack message can make the agent run commands on the machine. The allowlist, a private workspace and pre-approved permissions are the only protection, so keep them tight.
- Slack messages are not end-to-end encrypted. Do not send secrets or customer data.
- An unattended session stalls if a command needs a terminal permission prompt that is not pre-allowed.
- Free Slack workspaces keep 90 days of history.
- Polling, not push: replies can lag by a few seconds.

## Productivity impact

**TBD.** There are no measurements in the repo or on the machine. Record real numbers here, labelled **measured** or **estimated**: tasks handled remotely per week, time to answer a blocked decision before and after, hours of agent time recovered.

## Comparison with Muse and other remote bots

**TBD.** What is known from the source is the slack-relay side, in the table below. The columns for the other tools must be filled from their own documentation.

| Aspect | slack-relay |
| ------ | ----------- |
| Transport | Slack Web API polling over HTTPS, no inbound connection |
| Hosting | Runs on your own machine, no server |
| Auth | Bot token plus user-ID allowlist |
| Task scope | Configured workspace directories only |
| Approvals | Explicit yes in Slack for risky actions |
| Input types | Text only |
| Notifications | Slack push on every agent message |
| Latency | Polling interval (4 s default) |

Gaps and similarities to Muse and the other bots: **TBD**.

## Open questions

1. Which tool is "Muse", and which other remote bots belong in the comparison?
2. What productivity figures exist, and are they measured or estimated?

Follow-up work will be tracked as issues in `daizhixia3235/docs` with the `relay-bot` label and a priority.
