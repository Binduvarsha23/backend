import express from "express";
import Investment from "../models/Investment.js";

const router = express.Router();

// GET investments by userId
router.get("/", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "Missing userId" });
  const investments = await Investment.find({ userId });
  res.json(investments);
});

// POST investment with userId
router.post("/", async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });
  const inv = await Investment.create(req.body);
  res.json(inv);
});


router.put("/:id", async (req, res) => {
  const updated = await Investment.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  await Investment.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

export default router;
