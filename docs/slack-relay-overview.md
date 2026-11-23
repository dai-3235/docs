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

## Comparison with other remote bots

Compared with the public alternatives found in a web search on 2026-11-22. Claims about other tools are as their own pages and READMEs describe them and are not tested here. Check current status before relying on any of them.

**Muse: TBD.** No public product called "Muse" turned up. It needs to be identified before it can be compared.

| Tool | What it is | Channels | Similar to slack-relay | Gap versus slack-relay |
| ---- | ---------- | -------- | ---------------------- | ---------------------- |
| [Anthropic Remote Control](https://www.datacamp.com/tutorial/claude-code-remote-control) | Built in. Run `/rc`, scan a QR code, continue the session from the Claude mobile app. Needs Claude Code 2.1.51 or later and a paid plan | Claude mobile app | Drives a Claude Code session on your own machine from a phone | No Slack or chat app, no allowlist or workspace scoping of its own, no per-message push through a chat app |
| [Claude Code Channels](https://dev.to/alanwest/claude-code-channels-control-your-ai-coding-agent-from-telegram-2b0n) | Official research preview. Plugin install, bot token, pairing code | Telegram, Discord | Chat bot with a bot token and a pairing step | No Slack. The bot replies only while the channel is active |
| [claude-telegram-remote](https://github.com/oscarsterling/claude-telegram-remote) | Script set with 23 commands, checkpoint rollback, session save and restore | Telegram | Same idea on another chat app | Telegram only |
| [Claude-Code-Remote](https://github.com/JessyTsui/Claude-Code-Remote) | Open source bridge | Discord, Slack app with slash commands, email, Telegram | Includes a Slack app | Several channels; not compared in detail |
| [OpenACP](https://dev.to/sumaninster/telechat-vs-claude-code-channels-which-claude-on-mobile-setup-is-right-for-you-2a8k) | Connects agents (Claude Code, Gemini CLI, Codex) through the Agent Client Protocol | Telegram, Discord, Slack | Slack support | Multi-agent and multi-channel, not Claude Code only |

### Similarities

- All of them put a chat or phone surface in front of an agent that runs on your own machine.
- Chat-app bots (Channels, the Telegram bots, Claude-Code-Remote) use a bot token and a pairing or allowlist step, as slack-relay does.

### Gaps in slack-relay

- Slack only, and one agent (Claude Code). Tools such as Claude-Code-Remote and OpenACP cover more channels or agents.
- Text only. Files and images are ignored.
- No session commands such as the checkpoint rollback and save and restore in claude-telegram-remote. Control is limited to `status`, `cancel` and `stop`.
- Needs the Mac awake and online, and polls every 4 seconds instead of receiving pushes.
- Unattended runs stall on a terminal permission prompt unless commands are pre-allowed.
- Not a continuation of one live session the way Remote Control is. Each message is a task handed to the dispatch loop.

### Where slack-relay is stronger

- No public server, tunnel or Socket Mode connection.
- A message sender allowlist, tasks limited to configured workspaces, and an explicit yes in Slack for pushes, deletes and deploys.
- Works with a free Slack workspace and a separate bot account that triggers a real phone push for each agent message.

## Open questions

1. Which tool is "Muse"? It needs a link or description before it can be added to the comparison.
2. What productivity figures exist, and are they measured or estimated?

Follow-up work will be tracked as issues in `daizhixia3235/docs` with the `relay-bot` label and a priority.
