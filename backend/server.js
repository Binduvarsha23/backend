import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';

import adminFieldConfigRoute from './routes/adminFieldConfig.js';
import blocksRoute from './routes/blocks.js';
import blockFieldsRoute from './routes/blockFields.js';
import saveFormRoute from './routes/saveForm.js';
import savedFormsRoute from './routes/savedForms.js';

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

// API Routes
app.use('/api/blocks', blocksRoute);
app.use('/api/block-fields', blockFieldsRoute);
app.use('/api/save-form', saveFormRoute);
app.use('/api/saved-forms', savedFormsRoute);
app.use('/api/admin-field-config', adminFieldConfigRoute);


// Default fallback route (optional)
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
