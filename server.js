require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// मोंगोडीबी कनेक्शन
mongoose
  .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 })
  .then(() => console.log("🟢 MongoDB Connected Successfully"))
  .catch((err) => console.error("🔴 MongoDB Connection Error:", err.message));

// वोटर स्कीमा
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
  { collection: "voters" },
);

const Voter = mongoose.model("Voter", voterSchema);

// एक्सप्रेस मिडिलवेयर
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ==================== [ 🔍 SEARCH API ENDPOINT ] ====================
app.get("/api/search", async (req, res) => {
  let query = req.query.q;
  if (!query) return res.status(400).json({ error: "Query is required" });

  query = query.trim().toUpperCase();

  try {
    // 1. मकान नंबर सर्च (अगर सिर्फ नंबर है)
    if (/^\d+$/.test(query)) {
      const results = await Voter.find({ House_No: query }).sort({
        Serial_No: 1,
      });
      return res.json({ type: "house", results });
    }

    // स्पेशल कैरेक्टर्स (जैसे /) को सेफली एस्केप करना
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");

    // मोंगोडीबी Regex सर्च - केस इनसेंसिटिव
    const found = await Voter.find({
      Voter_ID: { $regex: new RegExp(escapedQuery, "i") },
    }).sort({ Serial_No: 1 });

    return res.json({ type: "voter", results: found });
  } catch (err) {
    console.error("🔴 Search Error:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// ==================== [ 🛠️ EXPRESS 5+ BUG FIX ] ====================
// एरर को जड़ से खत्म करने के लिए स्ट्रिंग '/*' की जगह सीधे Pure Regex इस्तेमाल कर रहे हैं
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Open http://localhost:${PORT} in your browser`);
});
