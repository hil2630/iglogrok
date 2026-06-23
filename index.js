require("dotenv").config();

const { Client, GatewayIntentBits, Intents } = require("discord.js");

const token = process.env.DISCORD_BOT_TOKEN;

if (!token) {
  console.error("Missing DISCORD_BOT_TOKEN in environment.");
  process.exit(1);
}

// Support discord.js v13 and v14 (audit --force downgraded you to v13).
const intents = GatewayIntentBits
  ? [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ]
  : [
      Intents.FLAGS.GUILDS,
      Intents.FLAGS.GUILD_MESSAGES,
      Intents.FLAGS.MESSAGE_CONTENT,
    ];

const client = new Client({ intents });

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!client.user) return;
  if (!message.mentions.users.has(client.user.id)) return;

  const answer = Math.random() < 0.5 ? "yes" : "no";

  try {
    await message.reply({
      content: answer,
      allowedMentions: { repliedUser: false },
    });
  } catch (error) {
    console.error("Failed to reply:", error);
  }
});

client.login(token);
