import express from "express";
import SecurityConfig from "../models/SecurityConfig.js";
import nodemailer from "nodemailer";

const router = express.Router();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Get user's config
router.get("/:userId", async (req, res) => {
  try {
    const config = await SecurityConfig.findOne({ userId: req.params.userId });

    if (!config) {
      return res.status(200).json({
        setupRequired: true,
        message: "Security config not found. User has not set up anything yet.",
        config: null,
      });
    }

    res.json({ setupRequired: false, config });
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

// Update config
router.put("/:userId", async (req, res) => {
  const { userId } = req.body;
  try {
    const update = {};

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

    if (req.body.biometricEnabled === false) {
      update.biometricCredentials = [];
    }

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

// Verify method
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
      isMatch = true;
    }

    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    config.lastVerifiedAt = new Date();
    await config.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Verification failed" });
  }
});

// Save security questions
router.put("/security-questions/:userId", async (req, res) => {
  const { questions } = req.body;
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
      {
        $set: {
          securityQuestions: hashedQuestions,
          securityQuestionsLastUpdatedAt: new Date(),
        },
      },
      { new: true }
    );

    res.json(config);
  } catch (err) {
    res.status(500).json({ message: "Error saving questions" });
  }
});

// Verify one security answer
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
      config.lastVerifiedAt = new Date();
      await config.save();
      return res.json({ success: true });
    } else {
      return res.status(401).json({ message: "Incorrect answer" });
    }
  } catch (err) {
    res.status(500).json({ message: "Verification failed" });
  }
});

// Request reset
router.post("/request-method-reset", async (req, res) => {
  const { userId, email, methodToReset } = req.body;

  const allowedMethods = ["password", "pin", "pattern"];
  if (!userId || !email || !allowedMethods.includes(methodToReset)) {
    return res.status(400).json({ message: "Invalid input." });
  }

  try {
    const config = await SecurityConfig.findOne({ userId });
    if (!config) {
      return res.json({ message: "If an account exists, reset email sent." });
    }

    if (config.passwordResetTokenExpiry && config.passwordResetTokenExpiry > new Date()) {
      const minutesRemaining = Math.ceil(
        (config.passwordResetTokenExpiry.getTime() - Date.now()) / (1000 * 60)
      );
      return res.status(429).json({
        success: false,
        message: `A reset code was recently sent. Please wait ${minutesRemaining} minutes.`,
      });
    }

    const crypto = await import("crypto");
    const resetToken = crypto.randomBytes(32).toString("hex");
    const bcrypt = await import("bcryptjs");
    const hashedToken = await bcrypt.hash(resetToken, 10);

    config.passwordResetToken = hashedToken;
    config.passwordResetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
    await config.save();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Vault Account: ${methodToReset} Reset Code`,
      html: `
        <p>Hello,</p>
        <p>You have requested to reset your <strong>${methodToReset}</strong>.</p>
        <p>Use the following code in the app:</p>
        <h3 style="...">${resetToken}</h3>
        <p>Code valid for 1 hour.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Reset email sent to ${email}`);

    res.json({
      success: true,
      message: `Reset code sent to your email (${email}).`,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to send reset email." });
  }
});

// Reset method using token
router.post("/reset-method-with-token", async (req, res) => {
  const { userId, token, methodType, newValue } = req.body;

  try {
    const config = await SecurityConfig.findOne({ userId });
    if (
      !config ||
      !config.passwordResetToken ||
      !config.passwordResetTokenExpiry ||
      config.passwordResetTokenExpiry < new Date()
    ) {
      return res.status(400).json({ message: "Invalid or expired reset code." });
    }

    const bcrypt = await import("bcryptjs");
    const isTokenValid = await bcrypt.compare(token, config.passwordResetToken);
    if (!isTokenValid) {
      return res.status(400).json({ message: "Invalid reset code." });
    }

    const hashedNewValue = await bcrypt.hash(newValue, 10);

    if (methodType === "password") {
      config.passwordHash = hashedNewValue;
      config.passwordEnabled = true;
    } else if (methodType === "pin") {
      config.pinHash = hashedNewValue;
      config.pinEnabled = true;
    } else if (methodType === "pattern") {
      config.patternHash = hashedNewValue;
      config.patternEnabled = true;
    } else {
      return res.status(400).json({ message: "Invalid method type." });
    }

    config.passwordResetToken = null;
    config.passwordResetTokenExpiry = null;
    await config.save();

    res.json({ success: true, message: `${methodType} has been reset successfully.` });
  } catch (err) {
    res.status(500).json({ message: "Error resetting method." });
  }
});

export default router;
