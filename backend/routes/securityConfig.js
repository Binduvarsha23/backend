import express from "express";
import SecurityConfig from "../models/SecurityConfig.js";
// Removed: import { getAuth } from 'firebase-admin/auth'; // Not needed if Firebase Admin is not set up

const router = express.Router();

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
            // Optional: Update lastVerifiedAt if security questions also count as a verification method
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

// --- New Routes for Email-based Password Reset ---

// POST /api/security-config/request-password-reset
// This route is called when a user clicks "Forgot Password" and the frontend has their userId and email.
router.post("/request-password-reset", async (req, res) => {
    // Now expecting userId directly from frontend, along with email
    const { userId, email } = req.body; // Changed from just { email }

    if (!userId || !email) {
        return res.status(400).json({ message: "User ID and email are required." });
    }

    try {
        // 1. Find the security config for the user using the provided userId
        const config = await SecurityConfig.findOne({ userId });
        if (!config) {
            // Return a generic message for security, even if config not found
            // This prevents attackers from knowing if an email/userId exists
            return res.json({ message: "If an account with that email exists, a password reset link has been sent." });
        }

        // 2. Generate a secure, time-limited token
        const crypto = await import("crypto");
        const resetToken = crypto.randomBytes(32).toString("hex"); // Unhashed token for email
        const bcrypt = await import("bcryptjs");
        const hashedToken = await bcrypt.hash(resetToken, 10); // Hashed token for storage

        // Token expires in 1 hour
        const expiryDate = new Date(Date.now() + 3600000); // 1 hour from now

        // 3. Store the hashed token and expiry in the database
        config.passwordResetToken = hashedToken;
        config.passwordResetTokenExpiry = expiryDate;
        await config.save();

        // 4. TODO: Send email to the user with the reset link
        // Replace 'YOUR_FRONTEND_RESET_PAGE_URL' with the actual URL of your frontend
        // page where the user will enter their new password (e.g., /reset-password?token=...)
        const resetLink = `YOUR_FRONTEND_RESET_PAGE_URL?token=${resetToken}&userId=${userId}`;
        console.log(`Password reset link for ${email}: ${resetLink}`);
        // Example using Nodemailer (you'd need to set up nodemailer transport):
        /*
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.createTransport({
            service: 'gmail', // or your SMTP details
            auth: {
                user: 'your_email@gmail.com',
                pass: 'your_email_password' // Use app password for Gmail
            }
        });
        await transporter.sendMail({
            from: 'your_email@gmail.com',
            to: email,
            subject: 'Password Reset Request for Your Vault Account',
            html: `<p>You requested a password reset for your Vault account.</p>
                   <p>Please click on this link to reset your password: <a href="${resetLink}">${resetLink}</a></p>
                   <p>This link is valid for 1 hour.</p>
                   <p>If you did not request this, please ignore this email.</p>`
        });
        */

        res.json({ message: "If an account with that email exists, a password reset link has been sent." });
    } catch (err) {
        console.error("Error requesting password reset:", err);
        res.status(500).json({ message: "Error requesting password reset." });
    }
});


// POST /api/security-config/reset-password-with-token
// This route is called when a user submits a new password from the reset link page.
router.post("/reset-password-with-token", async (req, res) => {
    const { userId, token, newPassword } = req.body;

    try {
        const config = await SecurityConfig.findOne({ userId });
        if (!config) {
            return res.status(400).json({ message: "Invalid or expired token." });
        }

        // 1. Check if token exists and is not expired
        if (!config.passwordResetToken || !config.passwordResetTokenExpiry || config.passwordResetTokenExpiry < new Date()) {
            return res.status(400).json({ message: "Invalid or expired token." });
        }

        const bcrypt = await import("bcryptjs");
        // 2. Compare the provided token with the stored hashed token
        const isTokenValid = await bcrypt.compare(token, config.passwordResetToken);

        if (!isTokenValid) {
            return res.status(400).json({ message: "Invalid or expired token." });
        }

        // 3. Hash the new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // 4. Update the user's password and clear token fields
        config.passwordHash = newPasswordHash;
        config.passwordEnabled = true; // Ensure password login is enabled if it wasn't
        config.passwordResetToken = null;
        config.passwordResetTokenExpiry = null;
        await config.save();

        res.json({ success: true, message: "Password has been reset successfully." });
    } catch (err) {
        console.error("Error resetting password with token:", err);
        res.status(500).json({ message: "Error resetting password." });
    }
});


export default router;
