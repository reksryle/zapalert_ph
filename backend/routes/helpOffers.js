// routes/helpOffers.js
import express from "express";
const router = express.Router();
import { HelpOffer } from "../models/HelpOffer.js";
import { Emergency } from "../models/Emergency.js";

// POST - Create help offer
router.post("/", async (req, res) => {
  try {
    const { helperId, helperName, emergencyId, location, helpType } = req.body;
    
    const helpOffer = new HelpOffer({
      helperId,
      helperName,
      emergencyId,
      location,
      helpType
    });

    await helpOffer.save();
    
    // Update emergency counts
    await Emergency.findByIdAndUpdate(emergencyId, {
      $inc: { helpOffersCount: 1 }
    });

    // Emit to all connected clients
    const io = req.app.get("io");
    io.emit("help-offered", helpOffer);
    
    res.status(201).json({ 
      success: true, 
      message: "Help offer submitted successfully",
      helpOffer 
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to submit help offer" });
  }
});

// PATCH - Update help offer status
router.patch("/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const helpOffer = await HelpOffer.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        ...(status === 'ongoing' && { startedAt: new Date() }),
        ...(status === 'completed' && { completedAt: new Date() })
      },
      { new: true }
    ).populate('emergencyId');
    
    if (!helpOffer) {
      return res.status(404).json({ error: "Help offer not found" });
    }

    // Update emergency counts
    if (status === 'ongoing') {
      await Emergency.findByIdAndUpdate(helpOffer.emergencyId, {
        $inc: { ongoingHelpCount: 1 }
      });
    } else if (status === 'completed') {
      await Emergency.findByIdAndUpdate(helpOffer.emergencyId, {
        $inc: { ongoingHelpCount: -1 }
      });
    }

    // Emit status update
    const io = req.app.get("io");
    io.emit("help-offer-updated", helpOffer);
    
    res.json({ success: true, helpOffer });
  } catch (error) {
    res.status(500).json({ error: "Failed to update help offer" });
  }
});

// GET - Help offers for specific emergency
router.get("/emergency/:emergencyId", async (req, res) => {
  try {
    const helpOffers = await HelpOffer.find({ 
      emergencyId: req.params.emergencyId 
    }).sort({ offeredAt: -1 });
    
    res.json(helpOffers);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch help offers" });
  }
});

export default router;