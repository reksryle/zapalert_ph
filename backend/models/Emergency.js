// backend/models/Emergency.js
import mongoose from 'mongoose';

const emergencySchema = new mongoose.Schema({
  type: { 
    type: String, 
    required: true,
    enum: ['medical', 'rescue', 'food', 'shelter', 'other', 'multiple'] // ADD 'multiple' HERE
  },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  description: { type: String, required: true },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['active', 'responded', 'resolved'],
    default: 'active'
  },
  contact: { type: String },
  reportedAt: { type: Date, default: Date.now },
  // ADD THESE NEW FIELDS:
  helpOffersCount: { type: Number, default: 0 },
  ongoingHelpCount: { type: Number, default: 0 },
  requestedItems: { 
    type: [String], 
    default: [] // ADD THIS FIELD TO STORE ALL SELECTED HELP TYPES
  }
});

// Use named export
export const Emergency = mongoose.model('Emergency', emergencySchema);