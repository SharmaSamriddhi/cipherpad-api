const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
    },
    active: {
      type: Boolean,
      default: false,
    },
    lastLoginData: {
      date: {
        type: Date,
      },
      ip: {
        type: String,
      },
      city: {
        type: String,
      },
      region: {
        type: String,
      },
      country: {
        type: String,
      },
      lot: {
        type: String,
      },
      long: {
        type: String,
      },
    },
    token: {
      type: String,
    },
    accountDisabled: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("Users", userSchema);

module.exports = User;
