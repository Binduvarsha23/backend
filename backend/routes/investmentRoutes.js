import express from "express";
import Investment from "../models/Investment.js"; // Assuming your Investment model has 'name' and 'type' fields

const router = express.Router();

// GET investments by userId (No change)
router.get("/", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "Missing userId" });
  try {
    const investments = await Investment.find({ userId });
    res.json(investments);
  } catch (error) {
    console.error("Error fetching investments:", error);
    res.status(500).json({ error: "Failed to fetch investments" });
  }
});

// POST investment with userId
router.post("/", async (req, res) => {
  const { userId, name, type, ...restOfBody } = req.body; // Destructure to easily access name and type

  if (!userId) return res.status(400).json({ error: "Missing userId" });
  if (!name || !type) return res.status(400).json({ error: "Investment name and type are required." }); // Assuming name and type are essential

  // --- START: NEW Duplicate Check Logic for POST ---
  try {
    const existingInvestment = await Investment.findOne({ userId, name, type });
    if (existingInvestment) {
      return res.status(409).json({ error: `An investment named "${name}" of type "${type}" already exists. Please edit the existing investment to modify its nominees or value.` });
    }
  } catch (error) {
    console.error("Error during duplicate check for investment:", error);
    return res.status(500).json({ error: "Failed to check for duplicate investment." });
  }
  // --- END: NEW Duplicate Check Logic for POST ---

  try {
    const inv = await Investment.create({ userId, name, type, ...restOfBody });
    res.status(201).json(inv);
  } catch (error) {
    console.error("Error creating investment:", error);
    res.status(500).json({ error: 'Failed to create investment' });
  }
});

// PUT update investment
router.put("/:id", async (req, res) => {
  const { name, type, userId, ...restOfBody } = req.body; // Destructure to easily access name, type, userId

  // --- START: NEW Duplicate Check Logic for PUT ---
  // When updating, check for duplicates against *other* investments, not the one being updated
  if (name && type && userId) { // Only perform if name, type, and userId are provided in the update
    try {
      const existingInvestment = await Investment.findOne({ userId, name, type, _id: { $ne: req.params.id } }); // Exclude current investment by ID
      if (existingInvestment) {
        return res.status(409).json({ error: `Another investment named "${name}" of type "${type}" already exists. Please use a unique name/type combination for this investment.` });
      }
    } catch (error) {
      console.error("Error during duplicate check for investment update:", error);
      return res.status(500).json({ error: "Failed to check for duplicate investment during update." });
    }
  }
  // --- END: NEW Duplicate Check Logic for PUT ---

  try {
    const updated = await Investment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: "Investment not found" });
    res.json(updated);
  } catch (error) {
    console.error("Error updating investment:", error);
    res.status(500).json({ error: 'Failed to update investment' });
  }
});

// DELETE investment (No change)
router.delete("/:id", async (req, res) => {
  try {
    await Investment.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting investment:", error);
    res.status(500).json({ error: 'Failed to delete investment' });
  }
});

export default router;
