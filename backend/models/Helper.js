import mongoose from 'mongoose';

const helperSchema = new mongoose.Schema({
  name: { type: String }, // Optional
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  skills: [String], // ['medical', 'rescue', 'supplies', 'transport']
  status: {
    type: String,
    enum: ['available', 'busy'],
    default: 'available'
  },
  contact: { type: String }, // Optional
  joinedAt: { type: Date, default: Date.now }
});

// Use named export
export const Helper = mongoose.model('Helper', helperSchema);