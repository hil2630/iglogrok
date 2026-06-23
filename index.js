require("dotenv").config();

const { Client, GatewayIntentBits, Intents, AttachmentBuilder, MessageAttachment } = require("discord.js");
const OpenAI = require("openai");

const token = process.env.DISCORD_BOT_TOKEN;
const openAiApiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const imageModel = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";

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
const buildAttachment = AttachmentBuilder
  ? (buffer, name) => new AttachmentBuilder(buffer, { name })
  : (buffer, name) => new MessageAttachment(buffer, name);
const userReplyHistory = new Map();

function trimToMaxWords(text, maxWords) {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  return `${words.slice(0, maxWords).join(" ")}...`;
}

function extractPrompt(content, botId) {
  const mentionRegex = new RegExp(`<@!?${botId}>`, "g");
  return content.replace(mentionRegex, "").trim();
}

function extractImagePrompt(prompt) {
  return prompt.replace(/^(generate|generer)\s+/i, "").trim();
}

function isImageAttachment(attachment) {
  const contentType = (attachment.contentType || "").toLowerCase();
  if (contentType.startsWith("image/")) return true;

  const url = (attachment.url || "").toLowerCase();
  return /\.(png|jpe?g|gif|webp|bmp)(\?.*)?$/.test(url);
}

function getImageUrlsFromMessage(message) {
  const urls = [];
  if (!message?.attachments) return urls;

  for (const attachment of message.attachments.values()) {
    if (isImageAttachment(attachment) && attachment.url) {
      urls.push(attachment.url);
    }
  }

  return urls;
}

async function collectContextImageUrls(message) {
  const imageUrls = [...getImageUrlsFromMessage(message)];

  if (message.reference?.messageId && message.channel?.messages?.fetch) {
    try {
      const repliedToMessage = await message.channel.messages.fetch(message.reference.messageId);
      imageUrls.push(...getImageUrlsFromMessage(repliedToMessage));
    } catch (error) {
      // Ignore fetch issues for referenced messages.
    }
  }

  return [...new Set(imageUrls)].slice(0, 4);
}

function rememberReplyForUser(userId, replyMessage) {
  const existing = userReplyHistory.get(userId) || [];
  existing.push({
    channelId: replyMessage.channelId || replyMessage.channel?.id,
    messageId: replyMessage.id,
  });

  // Keep only recent reply refs per user to avoid unbounded memory growth.
  if (existing.length > 30) {
    existing.splice(0, existing.length - 30);
  }

  userReplyHistory.set(userId, existing);
}

async function removeRepliesForUser(userId) {
  if (!client.user) return 0;

  const refs = userReplyHistory.get(userId) || [];
  let removedCount = 0;

  for (const ref of refs) {
    if (!ref.channelId || !ref.messageId) continue;

    try {
      const channel = await client.channels.fetch(ref.channelId);
      if (!channel || !("messages" in channel)) continue;

      const botMessage = await channel.messages.fetch(ref.messageId);
      if (!botMessage) continue;
      if (botMessage.author?.id !== client.user.id) continue;

      await botMessage.delete();
      removedCount += 1;
    } catch (error) {
      // Ignore missing/undeletable messages and continue cleanup.
    }
  }

  userReplyHistory.delete(userId);
  return removedCount;
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
      content: "Tag mig med et spoergsmaal, saa svarer jeg paa dansk (maks 150 ord).",
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  if (/^(remove|fjern)\b/i.test(prompt)) {
    const removedCount = await removeRepliesForUser(message.author.id);
    await message.reply({
      content: removedCount
        ? `Jeg har fjernet ${removedCount} af dine tidligere Grok-svar.`
        : "Jeg fandt ingen tidligere Grok-svar at fjerne.",
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  let pendingReply = null;
  const isImageRequest = /^(generate|generer)\s+/i.test(prompt);

  try {
    pendingReply = await message.reply({
      content: isImageRequest ? "Generating image..." : "Thinkin...",
      allowedMentions: { repliedUser: false },
    });

    if (isImageRequest) {
      const imagePrompt = extractImagePrompt(prompt);

      if (!imagePrompt) {
        await pendingReply.edit({
          content: "Skriv fx: @grok Generate en futuristisk by ved solnedgang.",
          allowedMentions: { repliedUser: false },
        });
        return;
      }

      const imageResult = await openai.images.generate({
        model: imageModel,
        prompt: imagePrompt,
        size: "1024x1024",
      });

      const base64Image = imageResult.data?.[0]?.b64_json;
      if (!base64Image) {
        throw new Error("OpenAI image response did not include b64_json data.");
      }

      const imageBuffer = Buffer.from(base64Image, "base64");
      const imageFile = buildAttachment(imageBuffer, `grok-${Date.now()}.png`);

      await pendingReply.edit({
        content: "Her er dit billede.",
        files: [imageFile],
        allowedMentions: { repliedUser: false },
      });
      rememberReplyForUser(message.author.id, pendingReply);
      return;
    }

    const imageUrls = await collectContextImageUrls(message);
    const userContent = [{ type: "input_text", text: prompt }];

    if (imageUrls.length > 0) {
      userContent.push({
        type: "input_text",
        text: "Brug ogsaa disse billeder som kontekst til svaret.",
      });

      for (const imageUrl of imageUrls) {
        userContent.push({
          type: "input_image",
          image_url: imageUrl,
        });
      }
    }

    const response = await openai.responses.create({
      model,
      input: [
        {
          role: "system",
          content:
            "Du er Grok, en kortfattet Discord-assistent. Svar altid paa dansk, vaer mega flabet, drillende og sarkastisk i tonen, men hold det let og humoristisk. Svar paa brugerens spoergsmaal tydeligt med maks 150 ord.",
        },
        { role: "user", content: userContent },
      ],
      max_output_tokens: 260,
    });

    const aiText = response.output_text?.trim() || "Jeg kunne ikke generere et svar lige nu.";
    const finalText = trimToMaxWords(aiText, 150);

    await pendingReply.edit({
      content: finalText,
      allowedMentions: { repliedUser: false },
    });
    rememberReplyForUser(message.author.id, pendingReply);
  } catch (error) {
    console.error("Failed to generate AI reply:", error);
    if (pendingReply) {
      await pendingReply.edit({
        content: "Der skete en fejl eller du overholdte ikke reglerne. Prøv igen om et ojeblik.",
        allowedMentions: { repliedUser: false },
      });
      rememberReplyForUser(message.author.id, pendingReply);
    } else {
      await message.reply({
        content: "Der skete en fejl eller du overholdte ikke reglerne. Prøv igen om et ojeblik.",
        allowedMentions: { repliedUser: false },
      });
    }
  }
});

client.login(token);
