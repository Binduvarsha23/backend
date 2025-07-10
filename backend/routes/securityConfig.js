import express from "express";
import SecurityConfig from "../models/SecurityConfig.js";
import nodemailer from 'nodemailer'; // Import Nodemailer
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import base64url from "base64url";
const router = express.Router();

// Configure Nodemailer transporter
// IMPORTANT: Use environment variables for user and pass in production!
const transporter = nodemailer.createTransport({
    service: 'gmail', // You can use other services like 'Outlook365', 'SendGrid', or direct SMTP
    auth: {
        user: process.env.EMAIL_USER, // Your sending email address (e.g., from .env)
        pass: process.env.EMAIL_PASS, // Your email password or app-specific password (from .env)
    },
    // For Gmail, if you have 2FA enabled, you might need to generate an "App password"
    // via your Google Account security settings.
});

// --- Existing Routes (No change, just context) ---

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
if (req.body.biometricEnabled === false) {
  update.biometricCredentials = []; // Clear credentials on disable
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
            config.lastVerifiedAt = new Date();
            await config.save();
            return res.json({ success: true });
        } else {
            return res.status(401).json({ message: "Incorrect answer" });
        }
    } catch (err) {
        console.error("Security answer verification error:", err);
        res.status(500).json({ message: "Verification failed" });
    }
});

// --- MODIFIED: POST /api/security-config/request-method-reset ---
// This route is called when a user wants to reset their PIN/Password/Pattern via email.
// It now expects userId, email, and the specific method to reset, and includes a cooldown.
router.post("/request-method-reset", async (req, res) => {
    const { userId, email, methodToReset } = req.body;

    if (!userId || !email || !methodToReset) {
        return res.status(400).json({ message: "User ID, email, and method to reset are required." });
    }

    const allowedMethods = ['password', 'pin', 'pattern'];
    if (!allowedMethods.includes(methodToReset)) {
        return res.status(400).json({ message: "Invalid method specified for reset." });
    }

    try {
        const config = await SecurityConfig.findOne({ userId });
        if (!config) {
            // For security, always return a generic success message to prevent user enumeration
            return res.json({ message: "If an account with that email exists, a reset code has been sent." });
        }

        // --- NEW COOLDOWN LOGIC ---
        // Check if a token was recently sent and is still within the cooldown period
        if (config.passwordResetTokenExpiry && config.passwordResetTokenExpiry > new Date()) {
            const timeRemaining = config.passwordResetTokenExpiry.getTime() - Date.now();
            const minutesRemaining = Math.ceil(timeRemaining / (1000 * 60));
            if (minutesRemaining > 0) { // If still within the valid expiry, it means a token was sent less than an hour ago
                 return res.status(429).json({ // 429 Too Many Requests
                    success: false,
                    message: `A reset code was recently sent. Please wait ${minutesRemaining} minutes before requesting another.`,
                 });
            }
        }
        // --- END NEW COOLDOWN LOGIC ---

        const crypto = await import("crypto");
        const resetToken = crypto.randomBytes(32).toString("hex"); // Plain token to send in email
        const bcrypt = await import("bcryptjs");
        const hashedToken = await bcrypt.hash(resetToken, 10); // Hashed token to store

        const expiryDate = new Date(Date.now() + 3600000); // Token valid for 1 hour

        config.passwordResetToken = hashedToken; // Reusing this field for any method's reset token
        config.passwordResetTokenExpiry = expiryDate; // This now also serves as the cooldown timer
        await config.save();

        // --- Send the email with the reset code ---
        const mailOptions = {
            from: process.env.EMAIL_USER, // Your configured sender email
            to: email, // The user's email address
            subject: `Vault Account: ${methodToReset} Reset Code`,
            html: `
                <p>Hello,</p>
                <p>You have requested to reset your <strong>${methodToReset}</strong> for your Vault account.</p>
                <p>Please use the following code to reset your ${methodToReset} within the application:</p>
                <h3 style="color: #007bff; font-size: 24px; text-align: center; border: 1px solid #007bff; padding: 10px; border-radius: 5px;">${resetToken}</h3>
                <p>This code is valid for 1 hour.</p>
                <p>If you did not request this, please ignore this email.</p>
                <p>Thank you,</p>
                <p>The Vault Team</p>
            `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`Reset email sent to ${email} for ${methodToReset}.`);

        res.json({
            success: true,
            message: `A reset code has been sent to your email (${email}). Please check your inbox.`,
        });

    } catch (err) {
        console.error("Error requesting method reset or sending email:", err);
        // Provide generic error message to frontend for security
        res.status(500).json({ message: "Failed to send reset email. Please try again later." });
    }
});


// --- MODIFIED: POST /api/security-config/reset-method-with-token ---
// This route is called when a user submits the email-sent code and their new method value.
router.post("/reset-method-with-token", async (req, res) => {
    const { userId, token, methodType, newValue } = req.body;

    if (!userId || !token || !methodType || !newValue) {
        return res.status(400).json({ message: "All required fields are missing." });
    }

    try {
        const config = await SecurityConfig.findOne({ userId });
        if (!config) {
            return res.status(400).json({ message: "Invalid or expired reset code." });
        }

        // 1. Check if token exists and is not expired
        if (!config.passwordResetToken || !config.passwordResetTokenExpiry || config.passwordResetTokenExpiry < new Date()) {
            return res.status(400).json({ message: "Invalid or expired reset code. Please request a new one." });
        }

        const bcrypt = await import("bcryptjs");
        // 2. Compare the provided token (plain text from email) with the stored hashed token
        const isTokenValid = await bcrypt.compare(token, config.passwordResetToken);

        if (!isTokenValid) {
            return res.status(400).json({ message: "Invalid reset code. Please try again." });
        }

        // 3. Hash the new value (password, pin, or pattern)
        const hashedNewValue = await bcrypt.hash(newValue, 10);

        // 4. Update the specific method's hash and clear token fields
        if (methodType === 'password') {
            config.passwordHash = hashedNewValue;
            config.passwordEnabled = true; // Ensure it's enabled if reset
        } else if (methodType === 'pin') {
            config.pinHash = hashedNewValue;
            config.pinEnabled = true; // Ensure it's enabled if reset
        } else if (methodType === 'pattern') {
            config.patternHash = hashedNewValue;
            config.patternEnabled = true; // Ensure it's enabled if reset
        } else {
            return res.status(400).json({ message: "Invalid method type provided for reset." });
        }

        config.passwordResetToken = null; // Clear the token
        config.passwordResetTokenExpiry = null; // Clear the expiry
        await config.save();

        res.json({ success: true, message: `${methodType} has been reset successfully.` });
    } catch (err) {
        console.error("Error resetting method with token:", err);
        res.status(500).json({ message: "Error resetting method. Please try again." });
    }
});const bufferFromBase64url = (val) => {
  if (!val || typeof val !== "string") throw new Error("Invalid base64url value");
  return base64url.toBuffer(val);
};


// Biometric Registration
router.get("/biometric/generate-registration-options/:userId", async (req, res) => {
  const userId = req.params.userId;
  const config = await SecurityConfig.findOne({ userId });
  if (!config) return res.status(404).json({ message: "Config not found" });

  const options = await generateRegistrationOptions({
    rpName: "Secure Vault",
    rpID: "localhost",
    userID: Buffer.from(userId, "utf-8"),  // Correct
    userName: `user-${userId}`,
    excludeCredentials: config.biometricCredentials.map((cred) => ({
      id: cred.credentialID, // ✅ FIXED: must be base64url string
      type: "public-key",
    })),
  });

  config.currentChallenge = options.challenge;
  await config.save();

  options.user.id = base64url.encode(options.user.id); // Send base64url-encoded id to frontend
  res.json(options);
});

router.post("/biometric/verify-registration/:userId", async (req, res) => {
  const userId = req.params.userId;
  const config = await SecurityConfig.findOne({ userId });
  if (!config) return res.status(404).json({ message: "Config not found" });

  const expectedChallenge = config.currentChallenge;

  const verification = await verifyRegistrationResponse({
    response: req.body.attestationResponse,
    expectedChallenge,
    expectedOrigin: "http://localhost:3000",
    expectedRPID: "localhost",
  });

  if (!verification.verified) return res.status(400).json({ message: "Biometric registration failed" });

  const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

  config.biometricCredentials.push({
    credentialID: base64url.encode(Buffer.from(credentialID)),
    publicKey: base64url.encode(Buffer.from(credentialPublicKey)),
    counter,
    transports: req.body.transports || [],
  });
  config.biometricEnabled = true;
  config.currentChallenge = null;
  await config.save();

  res.json({ success: true });
});

router.get("/biometric/generate-authentication-options/:userId", async (req, res) => {
  const userId = req.params.userId;
  const config = await SecurityConfig.findOne({ userId });
  if (!config) return res.status(404).json({ message: "Config not found" });

  let allowCredentials = [];
  try {
    allowCredentials = (config.biometricCredentials || [])
  .filter(cred => cred.credentialID)
  .map((cred) => ({
    id: cred.credentialID, // ✅ leave as base64url string
    type: "public-key",
    transports: cred.transports || [],
  }));

const options = await generateAuthenticationOptions({
  timeout: 60000,
  rpID: "localhost", // or your actual domain
  allowCredentials,
});

  config.currentChallenge = options.challenge;
  await config.save();

  res.json(options);
}catch (err) {
  console.error("Failed to generate biometric authentication options:", err);
  res.status(500).json({ message: "Failed to generate biometric options." });
}
});
router.post("/biometric/verify", async (req, res) => {
  const { userId, authenticationResponse } = req.body;
  const config = await SecurityConfig.findOne({ userId });
  if (!config || !config.biometricCredentials.length) {
    return res.status(404).json({ message: "No biometric credentials found" });
  }

  const credentialID = authenticationResponse.id;
  const stored = config.biometricCredentials.find(c => c.credentialID === credentialID);
  if (!stored) return res.status(400).json({ message: "Credential not registered" });

  const verification = await verifyAuthenticationResponse({
    response: authenticationResponse,
    expectedChallenge: config.currentChallenge,
    expectedOrigin: "http://localhost:3000",
    expectedRPID: "localhost",
    authenticator: {
      credentialID: bufferFromBase64url(stored.credentialID),
      credentialPublicKey: bufferFromBase64url(stored.publicKey),
      counter: stored.counter,
    },
  });

  if (!verification.verified) return res.status(400).json({ message: "Biometric verification failed" });

  stored.counter = verification.authenticationInfo.newCounter;
  config.lastVerifiedAt = new Date();
  config.currentChallenge = null;
  await config.save();

  res.json({ success: true });
});


export default router;
