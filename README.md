# Grok Discord Bot

Simple Node.js Discord bot that sends tagged questions to OpenAI and replies with a concise answer (max 150 words).

Example:

`@grok is this real?`

Bot replies with an AI answer in 150 words or less.

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
# edit .env and set:
# DISCORD_BOT_TOKEN
# OPENAI_API_KEY
# OPENAI_MODEL (optional, default is gpt-4.1-mini)
npm start
```

## 4) Keep it running on VPS (PM2)

```bash
npm install -g pm2
pm2 start index.js --name grok
pm2 save
pm2 startup
```
