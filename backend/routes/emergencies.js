import express from "express";
const router = express.Router();
import { Emergency, Helper } from "../models/index.js";

// GET all active emergencies
router.get("/", async (req, res) => {
  try {
    const emergencies = await Emergency.find({ status: 'active' });
    res.json(emergencies);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch emergencies" });
  }
});

// POST new emergency
router.post("/", async (req, res) => {
  try {
    const { type, location, description, severity, contact } = req.body;
    
    const emergency = new Emergency({
      type,
      location,
      description,
      severity: severity || 'medium',
      contact
    });

    await emergency.save();
    
    // Emit to all connected clients
    const io = req.app.get("io");
    io.emit("new-emergency", emergency);
    
    res.status(201).json({ 
      success: true, 
      message: "Emergency reported successfully",
      emergency 
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to report emergency" });
  }
});

// PATCH update emergency status
router.patch("/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const emergency = await Emergency.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!emergency) {
      return res.status(404).json({ error: "Emergency not found" });
    }

    // Emit status update
    const io = req.app.get("io");
    io.emit("emergency-updated", emergency);
    
    res.json({ success: true, emergency });
  } catch (error) {
    res.status(500).json({ error: "Failed to update emergency" });
  }
});

export default router;