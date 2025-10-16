// backend/models/HelpOffer.js
import mongoose from 'mongoose';

const helpOfferSchema = new mongoose.Schema({
  helperName: { type: String, required: true }, // Just name, no user account
  emergencyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Emergency', 
    required: true 
  },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  helpType: {
    type: String,
    required: true,
    enum: ['medical', 'rescue', 'food', 'shelter', 'transport', 'other']
  },
  status: {
    type: String,
    enum: ['offered', 'ongoing', 'completed', 'cancelled'],
    default: 'offered'
  },
  offeredAt: { type: Date, default: Date.now },
  startedAt: { type: Date },
  completedAt: { type: Date }
});

export const HelpOffer = mongoose.model('HelpOffer', helpOfferSchema);