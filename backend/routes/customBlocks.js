import express from "express";
import CustomBlock from "../models/CustomBlock.js";

const router = express.Router();

// POST: Create custom block
router.post("/create", async (req, res) => {
  const { userId, blockName } = req.body;
  if (!userId || !blockName) {
    return res.status(400).json({ error: "userId and blockName are required" });
  }

  try {
    const newBlock = new CustomBlock({ userId, blockName });
    await newBlock.save();
    res.status(201).json(newBlock);
  } catch (err) {
    res.status(500).json({ error: "Failed to create block" });
  }
});

// GET: Fetch blocks by user
router.get("/user/:userId", async (req, res) => {
  try {
    const blocks = await CustomBlock.find({ userId: req.params.userId });
    res.json(blocks);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch blocks" });
  }
});

// DELETE: Delete custom block
router.delete("/:blockId", async (req, res) => {
  try {
    const result = await CustomBlock.findByIdAndDelete(req.params.blockId);
    if (!result) {
      return res.status(404).json({ error: "Block not found" });
    }
    res.json({ message: "Block deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete block" });
  }
});

export default router;
