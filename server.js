require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("🟢 MongoDB Connected"))
  .catch((err) => console.error("🔴 DB Error:", err));

const voterSchema = new mongoose.Schema(
  {
    Serial_No: String,
    Voter_ID: String,
    House_No: String,
    Ward: String,
    Bhag_Sankhya: String,
  },
  { collection: "voters" },
);

const Voter = mongoose.model("Voter", voterSchema);

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// ==================== [ /start कमांड - बिल्कुल फिक्स ] ====================
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || "User";

  // स्ट्रिंग को यहाँ सही तरीके से बंद किया गया है
  const welcomeMessage =
    `👋 *नमस्ते ${firstName}!* \n\n` +
    `वोटर लिस्ट सर्च बोट में आपका स्वागत है। यहाँ आप वोटर आईडी भेजकर तुरंत सर्च कर सकते हैं।\n\n` +
    `--- \n` +
    `⚙️ *Created & Managed By:* Akash Maurya\n` +
    `📞 *Contact:* +91-9079746372\n`;

  // मैसेज भेजने का फंक्शन स्ट्रिंग के बाहर अलग से आएगा
  bot.sendMessage(chatId, welcomeMessage, { parse_mode: "Markdown" });
});
// ==============================================================================

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  // अगर यूजर /start दबाता है, तो उसे ऊपर वाला हैंडलर जवाब देगा
  if (msg.text === "/start") return;

  let input = msg.text
    ? msg.text
        .trim()
        .toUpperCase()
        .replace(/[\/\s\\]/g, "")
    : "";

  try {
    bot.sendChatAction(chatId, "typing");

    // 1. मकान नंबर के लिए
    if (/^\d+$/.test(input)) {
      const family = await Voter.find({ House_No: input });
      if (family.length > 0) {
        let res = `🏠 *मकान ${input} के वोटर:*\n`;
        family.forEach(
          (m) => (res += `🔹 SNo: ${m.Serial_No} | ID: ${m.Voter_ID}\n`),
        );
        return bot.sendMessage(chatId, res, { parse_mode: "Markdown" });
      }
    }

    // 2. वोटर आईडी के लिए (ब्रह्मास्त्र: डेटाबेस का हर रिकॉर्ड चेक करेगा)
    const allVoters = await Voter.find({});
    const found = allVoters.find(
      (v) =>
        v.Voter_ID &&
        v.Voter_ID.toUpperCase().replace(/[\/\s\\]/g, "") === input,
    );

    if (found) {
      const reply = `✅ *वोटर मिल गया!*
----------------------------------
📌 *वॉर्ड:* ${found.Ward || "24"} | *भाग:* ${found.Bhag_Sankhya || "1"}
🔹 *SNo:* ${found.Serial_No}
🔹 *मकान:* ${found.House_No}
🔹 *Voter ID:* ${found.Voter_ID}
----------------------------------`;

      // यहाँ sendMenodssage को बदलकर sendMessage कर दिया है
      bot.sendMessage(chatId, reply, { parse_mode: "Markdown" });
    } else {
      bot.sendMessage(
        chatId,
        `❌ ID "${input}" नहीं मिली। (डेटाबेस में टोटल ${allVoters.length} रिकॉर्ड हैं)`,
      );
    }
  } catch (err) {
    bot.sendMessage(chatId, "⚠️ Error: " + err.message);
  }
});
