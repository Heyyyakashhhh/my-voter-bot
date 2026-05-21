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
); // कलेक्शन का नाम साफ़-साफ़ बता दिया

const Voter = mongoose.model("Voter", voterSchema);

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
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
    const allVoters = await Voter.find({}); // सब निकालो
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
