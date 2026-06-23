# Grok Discord Bot

Simple Node.js Discord bot that replies with `yes` or `no` when someone tags it.

Example:

`@grok is this real?`

Bot replies:

`yes` or `no`

## 1) Create the bot in Discord Developer Portal

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application named **Grok**
3. Go to **Bot** tab and create a bot user
4. Copy the bot token
5. In **Privileged Gateway Intents**, enable **Message Content Intent**

## 2) Invite bot to your server

In OAuth2 -> URL Generator:

- Scopes: `bot`
- Bot Permissions: `Send Messages`, `Read Message History`, `View Channels`

Open the generated URL and invite the bot to your server.

## 3) Run locally or on VPS

```bash
npm install
cp .env.example .env
# edit .env and set DISCORD_BOT_TOKEN
npm start
```

## 4) Keep it running on VPS (PM2)

```bash
npm install -g pm2
pm2 start index.js --name grok
pm2 save
pm2 startup
```
