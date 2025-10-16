import express from "express";
const router = express.Router();
import { Helper } from "../models/index.js";

// GET all available helpers
router.get("/", async (req, res) => {
  try {
    const helpers = await Helper.find({ status: 'available' });
    res.json(helpers);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch helpers" });
  }
});

// POST register as helper
router.post("/", async (req, res) => {
  try {
    const { name, location, skills, contact } = req.body;
    
    const helper = new Helper({
      name,
      location,
      skills: skills || [],
      contact
    });

    await helper.save();
    
    // Emit to all connected clients
    const io = req.app.get("io");
    io.emit("helper-joined", helper);
    
    res.status(201).json({ 
      success: true, 
      message: "Registered as helper successfully",
      helper 
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to register as helper" });
  }
});

export default router;