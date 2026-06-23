# Grok Discord Bot

Simple Node.js Discord bot that:
- answers tagged questions in Danish (max 150 words), and
- can generate images when asked with `Generate`.

Example:

`@grok er det her rigtigt?`

Bot replies with an AI answer in 150 words or less.

Image example:

`@grok Generate en viking i neon cyberpunk stil`

Bot replies with an AI-generated image.

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
# OPENAI_IMAGE_MODEL (optional, default is gpt-image-1)
npm start
```

## 4) Keep it running on VPS (PM2)

```bash
npm install -g pm2
pm2 start index.js --name grok
pm2 save
pm2 startup
```
