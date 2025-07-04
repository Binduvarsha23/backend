import express from 'express';
import FormData from '../models/FormData.js';
import Nominee from '../models/Nominee.js';
import Asset from '../models/Asset.js';
import Investment from '../models/Investment.js';
import Password from '../models/PasswordEntry.js';
import Family from '../models/Family.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const { userId, query } = req.query;
  const q = query?.toLowerCase() || "";

  if (!userId || !q) return res.status(400).json({ error: "Missing userId or query" });

  try {
    const [forms, nominees, assets, investments, passwords, families] = await Promise.all([
      FormData.find({ userId }),
      Nominee.find({ userId }),
      Asset.find({ userId }),
      Investment.find({ userId }),
      Password.find({ userId }),
      Family.find({ userId }),
    ]);

    const matchesQuery = (obj) =>
      Object.values(obj).some(val =>
        typeof val === 'string' && val.toLowerCase().includes(q)
      );

    const matchedForms = forms.filter(f =>
      matchesQuery(f.data) || (f.blockName?.toLowerCase().includes(q))
    ).map(f => ({ type: "Document", ...f._doc }));

    const matchedPasswords = passwords.filter(p => {
      const decrypted = JSON.parse(Buffer.from(p.data, 'base64').toString());
      return matchesQuery(decrypted) || (p.blockName?.toLowerCase().includes(q));
    }).map(p => ({ type: "Password", ...p._doc }));

    const matchedAssets = assets.filter(a =>
      matchesQuery(a) || a.assetName?.toLowerCase().includes(q)
    ).map(a => ({ type: "Asset", ...a._doc }));

    const matchedInvestments = investments.filter(i =>
      matchesQuery(i) || i.investmentName?.toLowerCase().includes(q)
    ).map(i => ({ type: "Investment", ...i._doc }));

    const matchedNominees = nominees.filter(n =>
      matchesQuery(n)
    ).map(n => ({
      type: "Nominee",
      ...n._doc,
      family: families.find(f => f._id.toString() === n.nomineeId?.toString())
    }));

    res.json([
      ...matchedForms,
      ...matchedPasswords,
      ...matchedAssets,
      ...matchedInvestments,
      ...matchedNominees
    ]);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
