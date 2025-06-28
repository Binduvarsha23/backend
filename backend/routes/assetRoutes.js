import express from "express";
import Asset from "../models/Asset.js";

const router = express.Router();

// GET assets by userId
router.get("/", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "Missing userId" });
  const assets = await Asset.find({ userId });
  res.json(assets);
});

// POST asset with userId
router.post("/", async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });
  const asset = await Asset.create(req.body);
  res.json(asset);
});


// ✅ Update asset
router.put("/:id", async (req, res) => {
  const updated = await Asset.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
});

// ✅ Delete asset
router.delete("/:id", async (req, res) => {
  await Asset.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

export default router;
