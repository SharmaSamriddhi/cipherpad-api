const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    user: {
      type: String,
    },
    note: {
      type: String,
    },
    title: {
      type: String,
    },
  },
  { timestamps: true }
);

const Notes = mongoose.model("Notes", noteSchema);

module.exports = Notes;
