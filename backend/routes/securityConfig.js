import express from "express";
import SecurityConfig from "../models/SecurityConfig.js";

const router = express.Router();

// Get user's config
router.get("/:userId", async (req, res) => {
  try {
    const config = await SecurityConfig.findOne({ userId: req.params.userId });
    if (!config) return res.status(404).json({ message: "Config not found" });
    res.json(config);
  } catch (err) {
    res.status(500).json({ message: "Error fetching config" });
  }
});

// Create default config
router.post("/", async (req, res) => {
  const { userId } = req.body;
  try {
    const existing = await SecurityConfig.findOne({ userId });
    if (existing) return res.status(400).json({ message: "Already exists" });
    const config = new SecurityConfig({ userId });
    await config.save();
    res.status(201).json(config);
  } catch (err) {
    res.status(500).json({ message: "Error creating config" });
  }
});

// Update config (enable/disable password, pin, pattern, biometric)
router.put("/:userId", async (req, res) => {
  const { userId } = req.body;
  try {
    const update = {};

    // Exclusivity logic
    if (req.body.passwordEnabled) {
      update.passwordEnabled = true;
      update.pinEnabled = false;
      update.patternEnabled = false;
      if (req.body.passwordHash) update.passwordHash = req.body.passwordHash;
    } else if (req.body.pinEnabled) {
      update.pinEnabled = true;
      update.passwordEnabled = false;
      update.patternEnabled = false;
      if (req.body.pinHash) update.pinHash = req.body.pinHash;
    } else if (req.body.patternEnabled) {
      update.patternEnabled = true;
      update.pinEnabled = false;
      update.passwordEnabled = false;
      if (req.body.patternHash) update.patternHash = req.body.patternHash;
    }

    // Individual flags
    if (typeof req.body.biometricEnabled === "boolean") {
      update.biometricEnabled = req.body.biometricEnabled;
    }

    if (req.body.passwordEnabled === false) update.passwordEnabled = false;
    if (req.body.pinEnabled === false) update.pinEnabled = false;
    if (req.body.patternEnabled === false) update.patternEnabled = false;

    update.updatedAt = new Date();

    const config = await SecurityConfig.findOneAndUpdate(
      { userId: req.params.userId },
      { $set: update },
      { new: true }
    );

    if (!config) return res.status(404).json({ message: "Config not found" });
    res.json(config);
  } catch (err) {
    res.status(500).json({ message: "Error updating config" });
  }
});

// Verify route for password, pin, pattern, biometric
router.post("/verify", async (req, res) => {
  const { userId, value, method } = req.body;

  try {
    const config = await SecurityConfig.findOne({ userId });
    if (!config) return res.status(404).json({ message: "Config not found" });

    const bcrypt = await import("bcryptjs");

    let isMatch = false;

    if (method === "pin" && config.pinHash) {
      isMatch = await bcrypt.compare(value, config.pinHash);
    } else if (method === "password" && config.passwordHash) {
      isMatch = await bcrypt.compare(value, config.passwordHash);
    } else if (method === "pattern" && config.patternHash) {
      isMatch = await bcrypt.compare(value, config.patternHash);
    } else if (method === "biometric") {
      isMatch = true; // browser handles biometric check
    }

    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    config.lastVerifiedAt = new Date();
    await config.save();

    res.json({ success: true });
  } catch (err) {
    console.error("Verification error", err);
    res.status(500).json({ message: "Verification failed" });
  }
});

// Check if user has verified in last 3 hours
router.get("/check-verification/:userId", async (req, res) => {
  try {
    const config = await SecurityConfig.findOne({ userId: req.params.userId });
    if (!config) return res.status(404).json({ message: "Config not found" });

    const last = config.lastVerifiedAt;
    const now = new Date();

    const verifiedRecently =
      last && now - new Date(last) < 3 * 60 * 60 * 1000; // 3 hours

    res.json({ verifiedRecently });
  } catch (err) {
    res.status(500).json({ message: "Error checking verification" });
  }
});

// PUT /api/security-config/security-questions/:userId
router.put("/security-questions/:userId", async (req, res) => {
  const { questions } = req.body; // array of { question, answer }
  if (!Array.isArray(questions) || questions.length !== 3) {
    return res.status(400).json({ message: "3 security questions required" });
  }

  try {
    const bcrypt = await import("bcryptjs");
    const hashedQuestions = await Promise.all(
      questions.map(async (q) => ({
        question: q.question,
        answerHash: await bcrypt.hash(q.answer, 10),
      }))
    );

    const config = await SecurityConfig.findOneAndUpdate(
      { userId: req.params.userId },
      { $set: { securityQuestions: hashedQuestions } },
      { new: true }
    );

    res.json(config);
  } catch (err) {
    res.status(500).json({ message: "Error saving questions" });
  }
});
// POST /api/security-config/verify-security-answer
router.post("/verify-security-answer", async (req, res) => {
  const { userId, question, answer } = req.body;

  try {
    const config = await SecurityConfig.findOne({ userId });
    if (!config || !config.securityQuestions?.length) {
      return res.status(404).json({ message: "No security questions set" });
    }

    const bcrypt = await import("bcryptjs");
    const match = await Promise.all(
      config.securityQuestions
        .filter((q) => q.question === question)
        .map(async (q) => await bcrypt.compare(answer, q.answerHash))
    );

    if (match.includes(true)) {
      return res.json({ success: true });
    } else {
      return res.status(401).json({ message: "Incorrect answer" });
    }
  } catch (err) {
    res.status(500).json({ message: "Verification failed" });
  }
});

export default router;
