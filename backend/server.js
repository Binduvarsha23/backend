import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';

import customBlockRoutes from "./routes/customBlocks.js";
import adminFieldConfigRoute from './routes/adminFieldConfig.js';
import blocksRoute from './routes/blocks.js';
import blockFieldsRoute from './routes/blockFields.js';
import saveFormRoute from './routes/saveForm.js';
import savedFormsRoute from './routes/savedForms.js';
import assetRoutes from "./routes/assetRoutes.js";
import investmentRoutes from "./routes/investmentRoutes.js";
import passwordRoutes from './routes/passwords.js';
import passwordCategoryRoutes from './routes/passwordCategories.js';
import familyRoutes from './routes/family.js';
import nomineeRoutes from './routes/nominees.js'; 
import searchRoutes from './routes/search.js';
import healthRecordRoutes from './routes/healthRecords.js';
import healthBlockRoutes from './routes/healthBlocks.js';

dotenv.config();
const app = express();

// Middleware
app.use(cors({
  origin: "*",
}));
app.use(express.json({ limit: '10mb' }));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // useFindAndModify and useCreateIndex are no longer supported in latest mongoose versions,
  // so no need to add them
});

mongoose.connection.once('open', () => {
  console.log('✅ Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

app.use("/api/custom-blocks", customBlockRoutes);
app.use('/api/blocks', blocksRoute);
app.use('/api/block-fields', blockFieldsRoute);
app.use('/api/save-form', saveFormRoute);
app.use('/api/saved-forms', savedFormsRoute);
app.use('/api/admin-field-config', adminFieldConfigRoute);
app.use("/api/assets", assetRoutes);
app.use("/api/investments", investmentRoutes);
app.use('/api/passwords', passwordRoutes);
app.use('/api/password-categories', passwordCategoryRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/nominees', nomineeRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/health-records', healthRecordRoutes);
app.use('/api/health-blocks', healthBlockRoutes);

// Default fallback route (optional)
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
