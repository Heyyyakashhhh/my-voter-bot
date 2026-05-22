require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");

// मोंगोडीबी कनेक्शन (ऑटो री-कनेक्ट फीचर के साथ)
const connectDB = () => {
  mongoose
    .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 })
    .then(() => console.log("🟢 MongoDB Connected Successfully"))
    .catch((err) => {
      console.error("🔴 MongoDB Connection Error:", err.message);
      setTimeout(connectDB, 5000); // अगर कनेक्शन टूटे तो 5 सेकंड बाद खुद कनेक्ट करे
    });
};
connectDB();

const voterSchema = new mongoose.Schema(
  {
    Serial_No: String,
    Voter_ID: String,
    Name: String,          
    Relation_Name: String, 
    House_No: String,
    Ward: String,
    Bhag_Sankhya: String,
  },
  { collection: "voters" }
);

const Voter = mongoose.model("Voter", voterSchema);

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// ग्लोबल एरर कैचर (जो बोट को कभी ऑफ नहीं होने देगा)
bot.on("polling_error", (msg) => console.log("⚠️ Polling Error:", msg));
process.on("unhandledRejection", (reason) => console.log("⚠️ Unhandled Rejection Caught:", reason));
process.on("uncaughtException", (err) => console.log("⚠️ Uncaught Exception Caught:", err));

// ==================== [ WELCOME MESSAGE WITH CREDIT ] ====================
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || "मित्र";

  const welcomeMessage = `👋 *नमस्ते, ${firstName}!* 🙏\n\n` +
                         `🗳️ *वोटर लिस्ट सर्च BOTE (वार्ड 24)* में आपका स्वागत है।\n` +
                         `--------------------------------------------------\n\n` +
                         `🔍 *सर्च करने के आसान तरीके:* \n\n` +
                         `👉 *वोटर आईडी से:* सीधा अपनी वोटर आईडी भेजें \n` +
                         `   _(उदाहरण: ZYG1371053)_\n\n` +
                         `👉 *मकान नंबर से:* सिर्फ मकान नंबर टाइप करके भेजें \n` +
                         `   _(उदाहरण: 4)_\n\n` +
                         `--------------------------------------------------\n` +
                         `💻 *Developed By:* Akash Maurya\n` +
                         `🚀 *Powered By:* AR Data & Web Solutions\n` +
                         `--------------------------------------------------\n` +
                         `💡 *नोट:* इंग्लिश के स्मॉल या कैपिटल अक्षरों से कोई फर्क नहीं पड़ता, बोट तुरंत ढूंढ लेगा!`;

  bot.sendMessage(chatId, welcomeMessage, { parse_mode: "Markdown" }).catch(e => console.log(e));
});

// ==================== [ MESSAGE HANDLER ] ====================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  if (!msg.text || msg.text === "/start") return;

  let input = msg.text.trim().toUpperCase().replace(/[\/\s\\]/g, "");

  try {
    bot.sendChatAction(chatId, "typing").catch(() => {});

    // 1. मकान नंबर सर्च
    if (/^\d+$/.test(input)) {
      const family = await Voter.find({ House_No: input });
      if (family && family.length > 0) {
        let res = `🏠 *मकान नंबर ${input} के कुल वोटर (${family.length}):*\n\n`;
        family.forEach((m) => {
          res += `🔹 *SNo:* ${m.Serial_No} | *नाम:* ${m.Name || "N/A"}\n   🆔 ID: ${m.Voter_ID}\n\n`;
        });
        return bot.sendMessage(chatId, res, { parse_mode: "Markdown" }).catch(e => console.log(e));
      } else {
        return bot.sendMessage(chatId, `❌ मकान नंबर "${input}" में कोई वोटर नहीं मिला भाई।`).catch(e => console.log(e));
      }
    }

    // 2. वोटर आईडी सर्च
    const found = await Voter.findOne({
      Voter_ID: { $regex: new RegExp("^" + input + "$", "i") }
    });

    if (found) {
      const reply = `✅ *वोटर रिकॉर्ड मिल गया!*\n---------------------------------------------\n👤 *नाम:* ${found.Name || "N/A"}\n👴🏽 *संबंधी का नाम:* ${found.Relation_Name || "N/A"}\n---------------------------------------------\n📌 *वॉर्ड संख्या:* ${found.Ward || "24"} | *भाग संख्या:* ${found.Bhag_Sankhya || "3"}\n🔹 *सीरियल नंबर (SNo):* ${found.Serial_No || "N/A"}\n🏠 *मकान नंबर:* ${found.House_No || "N/A"}\n🆔 *Voter ID:* ${found.Voter_ID || "N/A"}\n---------------------------------------------`;
      bot.sendMessage(chatId, reply, { parse_mode: "Markdown" }).catch(e => console.log(e));
    } else {
      bot.sendMessage(chatId, `❌ वोटर आईडी "${input}" डेटाबेस में नहीं मिली भाई।`).catch(e => console.log(e));
    }

  } catch (err) {
    console.error("🔴 Error caught:", err.message);
    bot.sendMessage(chatId, "⚠️ सर्वर बूट हो रहा है, कृपया 2 सेकंड बाद दोबारा भेजें।").catch(e => console.log(e));
  }
});