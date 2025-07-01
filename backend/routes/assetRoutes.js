import express from "express";
import Asset from "../models/Asset.js";
import multer from "multer"; // Import multer

const router = express.Router();

// Configure multer for memory storage
// This stores the file in memory as a Buffer, which is easy to convert to Base64
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Helper function to convert buffer to Base64
const convertBufferToBase64 = (buffer, mimetype) => {
  if (!buffer || !mimetype) return null;
  return `data:${mimetype};base64,${buffer.toString('base64')}`;
};

// GET assets by userId
router.get("/", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "Missing userId" });
  try {
    const assets = await Asset.find({ userId });
    res.json(assets);
  } catch (error) {
    console.error("Error fetching assets:", error);
    res.status(500).json({ error: "Failed to fetch assets" });
  }
});

// POST asset with userId and optional image upload
// Use upload.single('image') middleware to handle a single file upload named 'image'
router.post("/", upload.single('image'), async (req, res) => {
  const { userId, name, type, value, location, description } = req.body; // Extract fields from req.body

  if (!userId) return res.status(400).json({ error: "Missing userId" });
  if (!name || !type || value === undefined) return res.status(400).json({ error: "Missing required asset fields" });

  let imageUrl = null;
  if (req.file) {
    // If a file was uploaded, convert its buffer to Base64
    imageUrl = convertBufferToBase64(req.file.buffer, req.file.mimetype);
  } else if (req.body.imageUrl) {
    // Allow direct imageUrl string if no file upload (e.g., for existing URLs)
    imageUrl = req.body.imageUrl;
  }

  try {
    const asset = new Asset({
      userId,
      name,
      type,
      value,
      location,
      description,
      imageUrl // Save the Base64 string or provided URL
    });
    await asset.save();
    res.status(201).json(asset);
  } catch (error) {
    console.error("Error creating asset:", error);
    res.status(500).json({ error: 'Failed to create asset' });
  }
});

// PUT update asset with optional image upload
// Use upload.single('image') middleware for updates too
router.put("/:id", upload.single('image'), async (req, res) => {
  const { name, type, value, location, description, userId } = req.body; // Extract fields from req.body

  let imageUrl = null;
  if (req.file) {
    // If a new file is uploaded, convert it to Base64
    imageUrl = convertBufferToBase64(req.file.buffer, req.file.mimetype);
  } else if (req.body.imageUrl !== undefined) {
    // If imageUrl field is explicitly sent (even if empty, meaning user removed it)
    imageUrl = req.body.imageUrl;
  } else {
    // If no new file and no imageUrl field sent, retain existing imageUrl
    // You might need to fetch the existing asset to get its imageUrl if not sent in req.body
    // For simplicity, we'll assume the frontend sends the current imageUrl if not changing.
    // If the frontend sends an empty string for imageUrl, it will clear it.
  }

  const updateData = {
    name,
    type,
    value,
    location,
    description,
    imageUrl // Update with new Base64 or null/empty string
  };

  // Remove undefined fields to prevent overwriting with null if not provided
  Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

  try {
    const updated = await Asset.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) return res.status(404).json({ error: "Asset not found" });
    res.json(updated);
  } catch (error) {
    console.error("Error updating asset:", error);
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

// DELETE asset
router.delete("/:id", async (req, res) => {
  try {
    await Asset.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting asset:", error);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

export default router;
