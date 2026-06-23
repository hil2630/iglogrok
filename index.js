require("dotenv").config();

const { Client, GatewayIntentBits, Intents } = require("discord.js");
const OpenAI = require("openai");

const token = process.env.DISCORD_BOT_TOKEN;
const openAiApiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

if (!token) {
  console.error("Missing DISCORD_BOT_TOKEN in environment.");
  process.exit(1);
}

if (!openAiApiKey) {
  console.error("Missing OPENAI_API_KEY in environment.");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: openAiApiKey });

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

function trimToMaxWords(text, maxWords) {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  return `${words.slice(0, maxWords).join(" ")}...`;
}

function extractPrompt(content, botId) {
  const mentionRegex = new RegExp(`<@!?${botId}>`, "g");
  return content.replace(mentionRegex, "").trim();
}

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!client.user) return;
  if (!message.mentions.users.has(client.user.id)) return;

  const prompt = extractPrompt(message.content, client.user.id);

  if (!prompt) {
    await message.reply({
      content: "Tag me with a question and I will answer in 150 words max.",
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  try {
    const response = await openai.responses.create({
      model,
      input: [
        {
          role: "system",
          content:
            "You are Grok, a concise Discord assistant. Answer the user's question clearly in no more than 150 words.",
        },
        { role: "user", content: prompt },
      ],
      max_output_tokens: 260,
    });

    const aiText = response.output_text?.trim() || "I could not generate a response right now.";
    const finalText = trimToMaxWords(aiText, 150);

    await message.reply({
      content: finalText,
      allowedMentions: { repliedUser: false },
    });
  } catch (error) {
    console.error("Failed to generate AI reply:", error);
    await message.reply({
      content: "I hit an error talking to OpenAI. Please try again in a moment.",
      allowedMentions: { repliedUser: false },
    });
  }
});

client.login(token);
