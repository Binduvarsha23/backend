import express from 'express';
import FormData from '../models/FormData.js';
import Nominee from '../models/Nominee.js';
import Asset from '../models/Asset.js';
import Investment from '../models/Investment.js';
import Password from '../models/PasswordEntry.js';
import Family from '../models/FamilyMember.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const { userId, query } = req.query;
  const q = query?.toLowerCase() || "";

  if (!userId || !q) {
    return res.status(400).json({ error: "Missing userId or query" });
  }

  try {
    // Fetch all collections
    const [forms, nominees, assets, investments, passwords, families] = await Promise.all([
      FormData.find({ userId }),
      Nominee.find({ userId }),
      Asset.find({ userId }),
      Investment.find({ userId }),
      Password.find({ userId }),
      Family.find({ userId }),
    ]);

    // 🔁 Recursive matcher
    const matchesQuery = (obj) => {
      const check = (val) => {
        if (!val) return false;
        if (typeof val === 'string') return val.toLowerCase().includes(q);
        if (typeof val === 'number') return val.toString().includes(q);
        if (Array.isArray(val)) return val.some(check);
        if (typeof val === 'object') return Object.values(val).some(check);
        return false;
      };
      return check(obj);
    };

    // 🔍 FormData (Documents)
    const matchedForms = forms.filter(f =>
      matchesQuery(f.data) || (f.blockName?.toLowerCase().includes(q))
    ).map(f => ({
      type: "Document",
      ...f._doc
    }));

    // 🔍 Passwords (decrypted)
    const matchedPasswords = passwords.filter(p => {
      try {
        const decrypted = JSON.parse(Buffer.from(p.data, 'base64').toString());
        return matchesQuery(decrypted) || (p.blockName?.toLowerCase().includes(q));
      } catch (e) {
        return false;
      }
    }).map(p => ({
      type: "Password",
      ...p._doc
    }));

    // 🔍 Assets
    const matchedAssets = assets.filter(a =>
      matchesQuery(a)
    ).map(a => ({
      type: "Asset",
      ...a._doc
    }));

    // 🔍 Investments
    const matchedInvestments = investments.filter(i =>
      matchesQuery(i)
    ).map(i => ({
      type: "Investment",
      ...i._doc
    }));

    // 🔍 Nominees + linked Family Member
    const matchedNominees = nominees.filter(n =>
      matchesQuery(n)
    ).map(n => {
      const family = families.find(f => f._id.toString() === n.nomineeId?.toString());
      return {
        type: "Nominee",
        ...n._doc,
        family
      };
    });

    // 📦 Final combined result
    const allResults = [
      ...matchedForms,
      ...matchedPasswords,
      ...matchedAssets,
      ...matchedInvestments,
      ...matchedNominees
    ];

    res.json(allResults);
  } catch (err) {
    console.error("❌ Search error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
