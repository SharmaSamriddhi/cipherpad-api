const express = require("express");
const router = express.Router();
const Note = require("../Models/Notes");

// Create Note API Starts
router.post("/create", async (req, res) => {
  try {
    const { user, note, title } = req.body;
    const existingNote = await Note.findOne({ title: title });
    if (existingNote) {
      res
        .status(400)
        .json({ status: false, message: "New Already Exists with same title" });
      return;
    }
    newNote = new Note({
      user,
      note,
      title,
    });
    await newNote.save();
    res.status(200).json({ status: true, message: "New Noted Created" });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: false,
      message: "Something went Wrong, please try again.",
    });
  }
});
// Create Note API Ends
// view Note API Starts
router.get("/view", async (req, res) => {
  try {
    const { userId, noteId } = req.query; // Use req.query to get query parameters
    const note = await Note.findOne({ _id: noteId, user: userId });
    if (!note) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid Note/User ID" });
    }

    res.status(200).json({ status: true, noteData: note });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: false,
      message: "Something went wrong, please try again.",
    });
  }
});

router.get("/view/all/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const note = await Note.find({ user: userId }).sort({ createdAt: -1 });
    if (!note) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid Note/User ID" });
    }
    res.status(200).json({ status: true, notes: note });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Something went Wrong, please try again.",
    });
  }
});
// view Note API Ends
// Update Note API
router.put("/update", async (req, res) => {
  try {
    const { userId, noteId, updatedNote, updatedTitle } = req.body;
    const note = await Note.findOne({ _id: noteId, user: userId });
    if (!note) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid Note/User ID" });
    }
    note.note = updatedNote;
    note.title = updatedTitle;
    await note.save();
    res.status(200).json({
      status: true,
      message: "Note updated successfully",
      updatedNote: note,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "Something went wrong, please try again.",
    });
  }
});
// Delete Note API
router.delete("/delete", async (req, res) => {
  try {
    const { userId, noteId } = req.query;
    console.log(req.query);
    const deletedNote = await Note.findOneAndDelete({
      _id: noteId,
      user: userId,
    });
    if (!deletedNote) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid Note/User ID" });
    }
    const notes = await Note.find({
      user: userId,
    });
    res.status(200).json({
      status: true,
      message: "Note deleted successfully",
      notes,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "Something went wrong, please try again.",
    });
  }
});

module.exports = router;
