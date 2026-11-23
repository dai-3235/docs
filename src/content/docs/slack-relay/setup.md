---
title: "Running slack-relay on a Mac mini"
description: "Install the plugin, configure Slack, and keep it running for 24 hours."
sidebar:
  label: Setup
  order: 2
---

How to install `slack-relay` and keep it running all day on one machine. Source: `https://github.com/dai-3235/skills/tree/main/slack-relay`.

## What you need

- macOS with `claude` (Claude Code), `python3`, `caffeinate` and `screen` on the PATH (all ship with macOS except `claude`).
- A Slack workspace you control.
- Your Slack member ID (profile, then the three dots, then **Copy member ID**).

## 1. Install the plugin

```bash
claude plugin marketplace add dai-3235/skills
claude plugin install slack-relay@fred-skills
```

Restart Claude Code or run `/reload-plugins`. The skills `slack-relay:dispatch` and `slack-relay:ask` should appear.

## 2. Create the Slack app (manual, browser)

1. Open https://api.slack.com/apps, choose **Create New App**, then **From a manifest**, and pick the workspace.
2. Paste `slack-app-manifest.json` from the plugin folder.
3. **Install to Workspace**. Copy the **Bot User OAuth Token** (`xoxb-...`) from *OAuth & Permissions*.
4. Open the app from the Apps section of the Slack sidebar and send it one message so the DM exists.

## 3. Configure

Create `~/.config/slack-relay/config.json` and `chmod 600` it:

```json
{
  "token": "xoxb-...",
  "user_ids": ["U0123ABCD"],
  "channel_ids": [],
  "workspaces": {
    "hub": "/Users/fredbot/agent-work/docs",
    "docs": "/Users/fredbot/work/docs"
  }
}
```

- `user_ids` is the allowlist. Messages from anyone else are dropped before the agent sees them.
- Tasks only run inside `workspaces`. Start a message with the alias, for example `docs: add a glossary entry`.
- Never commit the token. `SLACK_BOT_TOKEN` in the environment overrides the file.

Check it:

```bash
python3 -I ~/.claude/plugins/cache/fred-skills/slack-relay/1.0.0/scripts/slack.py whoami
```

## 4. Run once by hand

```bash
~/.claude/plugins/cache/fred-skills/slack-relay/1.0.0/bin/relay-on 8
```

This checks Slack, keeps the Mac awake, and starts Claude Code listening for 8 hours. Send a task from your phone to confirm it replies.

## 5. Run 24 hours, unattended

`relay-on` stops after the hours you give it and needs a terminal. For a permanent setup, launchd restarts it inside a detached `screen` session.

- `~/.config/slack-relay/run-24h.sh` picks the newest installed plugin version and runs `relay-on 24 10m` in `screen` session `slack-relay`. The `10m` catch-up covers the gap between windows.
- `~/Library/LaunchAgents/ai.slack-relay.plist` runs that script at login and restarts it whenever it exits (60 s throttle). Log: `~/.config/slack-relay/relay.log`.

Start and stop:

```bash
launchctl load ~/Library/LaunchAgents/ai.slack-relay.plist      # start
launchctl unload ~/Library/LaunchAgents/ai.slack-relay.plist    # stop
screen -r slack-relay                                           # look at the session (detach: Ctrl-A D)
```

Also set the Mac to start itself and stay logged in: auto-login for the user, and *System Settings, Energy, Start up automatically after a power failure*. `relay-on` already runs `caffeinate`.

## 6. Permissions for unattended runs

A permission prompt in the terminal stalls the session while you are away. Before relying on it, allow only the commands tasks need, for example in the project's `.claude/settings.json`:

- `Bash(python3 -I <plugin dir>/scripts/slack.py:*)`
- read, edit and test commands for the workspaces.

Do not pre-allow `git push`, deletes or deploys. The dispatch skill asks for an explicit yes in Slack for those.

## Limits and risks

- A Slack message can make the agent run commands on this Mac. Keep the workspace private and the allowlist short.
- Slack messages are not end-to-end encrypted. No secrets or customer data in them.
- If the token leaks, rotate it in the app settings.
- Text only. Files and images are ignored.
- The Mac must stay online. If Slack is unreachable the loop retries, then stops, and launchd restarts it.
