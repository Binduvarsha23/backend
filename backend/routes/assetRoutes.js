// src/routes/assetRoutes.js (or similar path on your backend)
import express from "express";
import Asset from "../models/Asset.js";
import multer from "multer";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const convertBufferToBase64 = (buffer, mimetype) => {
  if (!buffer || !mimetype) return null;
  return `data:${mimetype};base64,${buffer.toString('base64')}`;
};

// GET assets by userId (No change here)
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
router.post("/", upload.single('image'), async (req, res) => {
  const { userId, name, type, value, location, description } = req.body;

  if (!userId) return res.status(400).json({ error: "Missing userId" });
  if (!name || !type || value === undefined) return res.status(400).json({ error: "Missing required asset fields" });

  // --- START: NEW Duplicate Check Logic for POST ---
  const existingAsset = await Asset.findOne({ userId, name, type });
  if (existingAsset) {
    return res.status(409).json({ error: `An asset named "${name}" of type "${type}" already exists. Please edit the existing asset to modify its nominees or value.` });
  }
  // --- END: NEW Duplicate Check Logic for POST ---

  let imageUrl = null;
  if (req.file) {
    imageUrl = convertBufferToBase64(req.file.buffer, req.file.mimetype);
  } else if (req.body.imageUrl) {
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
      imageUrl
    });
    await asset.save();
    res.status(201).json(asset);
  } catch (error) {
    console.error("Error creating asset:", error);
    res.status(500).json({ error: 'Failed to create asset' });
  }
});

// PUT update asset with optional image upload
router.put("/:id", upload.single('image'), async (req, res) => {
  const { name, type, value, location, description, userId } = req.body;

  // --- START: NEW Duplicate Check Logic for PUT ---
  // When updating, check for duplicates against *other* assets, not the one being updated
  // Ensure name, type, and userId are present in the update data to perform this check
  if (name && type && userId) {
    const existingAsset = await Asset.findOne({ userId, name, type, _id: { $ne: req.params.id } }); // Exclude current asset by ID
    if (existingAsset) {
      return res.status(409).json({ error: `Another asset named "${name}" of type "${type}" already exists. Please use a unique name/type combination for this asset.` });
    }
  }
  // --- END: NEW Duplicate Check Logic for PUT ---

  let imageUrl = null;
  if (req.file) {
    imageUrl = convertBufferToBase64(req.file.buffer, req.file.mimetype);
  } else if (req.body.imageUrl !== undefined) {
    imageUrl = req.body.imageUrl;
  }

  const updateData = {
    name,
    type,
    value,
    location,
    description,
    imageUrl
  };

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

router.patch("/:id/favorite", async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ error: "Asset not found" });
    asset.favorite = !asset.favorite;
    await asset.save();
    res.json({ success: true, favorite: asset.favorite });
  } catch (error) {
    console.error("Error toggling favorite:", error);
    res.status(500).json({ error: "Failed to update favorite" });
  }
});

// DELETE asset (No change here)
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
