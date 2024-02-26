const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const axios = require("axios");
const User = require("../Models/Users");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const EmailValidator = require("email-deep-validator");
const emailValidator = new EmailValidator();
const transporter = nodemailer.createTransport({
  host: "smtp.sendgrid.net",
  port: 465,
  auth: {
    user: "apikey",
    pass: "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",
  },
});

// User Signup API Starts
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || name.trim() === "") {
      res.status(400).json({ status: false, message: "Name cannot be empty" });
      return;
    }

    const passwordRegex = /^(?=.*\d)(?=.*[a-zA-Z])(?=.*[\W_]).{8,}$/;
    if (!password || !passwordRegex.test(password)) {
      res.status(400).json({
        status: false,
        message:
          "Password must be at least 8 characters long and contain at least one number, one letter, and one symbol",
      });
      return;
    }
    const userExists = await User.findOne({ email: email });
    if (userExists) {
      res.status(409).json({ status: false, message: "Email ID Already Used" });
      return;
    }
    const isEmailValid = await emailValidator.verify(email);

    if (
      isEmailValid.wellFormed == false ||
      isEmailValid.validDomain == false ||
      isEmailValid.validMailbox == false
    ) {
      res.status(409).json({
        status: false,
        message: "Email ID Does not exists",
        isEmailValid,
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      password: hashedPassword,
    });
    await user.save();
    const token = jwt.sign({ userId: user._id }, process.env.JWT_KEY, {
      expiresIn: "24h",
    });
    await User.findOneAndUpdate(
      { email: email },
      { $set: { token: token } },
      { new: true }
    );
    const activationLink = `${process.env.API_URL}/verify-email?token=${token}`;
    const info = await transporter.sendMail({
      from: '"Cipherpad" <cipherpad@focushub.cloud>',
      to: `${email}`,
      subject: `Welcome to Cipherpad! Activate Your Account Now 🚀`,
      text: `<div style="padding: 10px; text-align: center; font-family: Arial, sans-serif;">
          <img src="https://res.cloudinary.com/dwjisi2ul/image/upload/v1707656119/dry3jbhpodfmi6naqf1g.png" alt="logo" width="120px"/>
      <p style="font-size: 18px; font-weight: bold;">Hi ${name},</p>
      <p>Welcome to Cipherpad!</p>
      <p>Click the link below to activate your account and start exploring our app:</p>
      <a href="${activationLink}" style="display: inline-block; margin: 15px 0; padding: 10px 20px; background-color: #001B79; color: white; text-decoration: none; border-radius: 5px;">Activate Your Account</a>
      <p>If you have any questions or need assistance, feel free to contact our support team.</p>
      <p>Best regards,<br/>Cipherpad Team</p>
    </div>
    `,
      html: `<div style="padding: 10px; text-align: center; font-family: Arial, sans-serif;">
          <img src="https://res.cloudinary.com/dwjisi2ul/image/upload/v1707656119/dry3jbhpodfmi6naqf1g.png" alt="logo" width="120px"/>
      <p style="font-size: 18px; font-weight: bold;">Hi ${name},</p>
      <p>Welcome to Cipherpad!</p>
      <p>Click the link below to activate your account and start exploring our app:</p>
      <a href="${activationLink}" style="display: inline-block; margin: 15px 0; padding: 10px 20px; background-color: #001B79; color: white; text-decoration: none; border-radius: 5px;">Activate Your Account</a>
      <p>If you have any questions or need assistance, feel free to contact our support team.</p>
      <p>Best regards,<br/>Cipherpad Team</p>
    </div>
    `,
    });
    res.status(201).json({
      success: true,
      message: `Account Created Successfully, An activation link has been sent to ${email}`,
    });
  } catch (error) {
    res
      .status(409)
      .json({ status: false, message: "Something went wrong", error });
  }
});
// User Signup API Ends
// Login API Starts
router.post("/login", async (req, res) => {
  const { email, password, ip, date } = req.body;
  try {
    const user = await User.findOne({ email: email });
    if (!user) {
      return res
        .status(401)
        .json({ status: false, message: "Invalid credentials" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ status: false, message: "Invalid credentials" });
    }
    if (user.active != true) {
      return res
        .status(401)
        .json({ status: false, message: "Email Not Verified" });
    }
    let city, region, country, lat, long;
    try {
      const res = await axios.get(`http://ip-api.com/json/${ip}`);
      console.log(res);
      if (res.data.status == "fail") {
        city = "Not Found";
      } else {
        city = res.data.city;
        region = res.data.region;
        country = res.data.country;
        lat = res.data.lat;
        long = res.data.lon;
      }
    } catch (error) {
      console.log(error);
      city = "Not Found";
    }

    await User.findOneAndUpdate(
      { email: email },
      {
        $set: {
          lastLoginData: {
            date,
            ip,
            city,
            region,
            country,
            lat,
            long,
          },
        },
      },
      { new: true }
    );

    const token = jwt.sign({ userId: user._id }, process.env.JWT_KEY, {
      expiresIn: "24h",
    });
    res.json({
      status: true,
      message: "Logged In Succesfully",
      token: token,
      userId: user._id,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Something went wrong. Please try again later.",
    });
  }
});
// Login API Ends
router.post("/verify-account/initiate", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }
    if (user.active === true) {
      return res.status(404).json({
        status: false,
        message: "Email Already Verified",
      });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_KEY, {
      expiresIn: "6h",
    });
    user.token = token;
    await user.save();
    const activationLink = `${process.env.API_URL}/verify-email?token=${token}`;
    const info = await transporter.sendMail({
      from: '"Cipherpad" <cipherpad@focushub.cloud>',
      to: email,
      subject: "Cipherpad - Account Activation",
      text: `Click the following link to activate your account: ${activationLink}`,
      html: `<div style="padding: 20px; text-align: center; font-family: Arial, sans-serif; background:#fff; border:1px solid gray; border-radius:10px">
<img src="https://res.cloudinary.com/dwjisi2ul/image/upload/v1707656119/dry3jbhpodfmi6naqf1g.png" alt="logo" width="120px"/>        <p style="font-size: 18px; font-weight: bold;">Hi ${user.name},</p>
        <p>Click the link below to verify your account:</p>
        <a href="${activationLink}" style="display: inline-block; margin: 15px 0; padding: 10px 20px; background-color: #001B79; color: white; text-decoration: none; border-radius: 5px;">Verify Account</a>
        <p>If you have any questions or need assistance, feel free to contact our support team.</p>
        <p>Best regards,<br/>Cipherpad Team</p>
      </div>`,
    });

    return res.status(200).json({
      status: true,
      message: "Account Verification Link Sent to your email address.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: "Something Went Wrong",
    });
  }
});
// Activate Account API Ends
router.put("/verify-account", async (req, res) => {
  const { token } = req.body;

  try {
    // Verify the JWT token
    const decodedToken = jwt.verify(token, process.env.JWT_KEY);

    // Use the decoded token to find the user
    const user = await User.findOne({ _id: decodedToken.userId, token: token });

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "Invalid Token",
      });
    }

    const isAlreadyActive = user.active;
    if (isAlreadyActive) {
      return res.status(409).json({
        status: false,
        message: "Account Already Activated",
      });
    }

    // Update user's active status
    await User.findOneAndUpdate(
      { _id: decodedToken.userId, token: token },
      { $set: { active: true } },
      { new: true }
    );

    return res.status(200).json({
      status: true,
      message: `Account Activated! ${user.email}`,
    });
  } catch (error) {
    console.error(error);
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        status: false,
        message: "Token Expired",
      });
    } else if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        status: false,
        message: "Invalid Token",
      });
    }
    return res.status(500).json({
      status: false,
      message: "Something Went Wrong",
    });
  }
});
// Forgot Password API Starts
router.post("/reset-password/initiate", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }
    const resetToken = jwt.sign({ userId: user._id }, process.env.JWT_KEY, {
      expiresIn: "1h",
    });
    user.token = resetToken;
    await user.save();
    const resetLink = `${process.env.API_URL}/reset-password?token=${resetToken}`;
    const info = await transporter.sendMail({
      from: '"Cipherpad" <cipherpad@focushub.cloud>',
      to: email,
      subject: "Cipherpad - Password Recovery Instructions",
      text: `Click the following link to reset your password: ${resetLink}`,
      html: `<div style="padding: 20px; text-align: center; font-family: Arial, sans-serif; background:#fff; border:1px solid gray; border-radius:10px">
      <img src="https://res.cloudinary.com/dwjisi2ul/image/upload/v1707656119/dry3jbhpodfmi6naqf1g.png" alt="logo" width="120px"/>
        <p style="font-size: 18px; font-weight: bold;">Hi ${user.name},</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}" style="display: inline-block; margin: 15px 0; padding: 10px 20px; background-color: #001B79; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>If you didn't request this change, please ignore this email. Your password will remain unchanged.</p>
        <p>If you have any questions or need assistance, feel free to contact our support team.</p>
        <p>Best regards,<br/>Cipherpad Team</p>
      </div>`,
    });

    return res.status(200).json({
      status: true,
      message: "Password reset link sent",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: "Something Went Wrong",
    });
  }
});
// Forgot Password API Ends
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const decodedToken = jwt.verify(token, process.env.JWT_KEY);
    const user = await User.findOne({
      _id: decodedToken.userId,
      token: token,
    });
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "Invalid Token",
      });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.token = undefined;
    await user.save();
    return res.status(200).json({
      status: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error(error);
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError"
    ) {
      return res.status(401).json({
        status: false,
        message: "Invalid Token",
      });
    }
    return res.status(500).json({
      status: false,
      message: "Something Went Wrong",
    });
  }
});
// View User API Starts
router.get("/view/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId).select("-password");
    if (!user) {
      res
        .status(401)
        .json({ status: false, message: `Invalid User ID ${userId}` });
      return;
    }
    res.status(200).json({ status: true, userDetails: user });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Something went wrong, Please try again.",
    });
  }
});
// View User API Ends
// Update User API Starts
router.put("/update", async (req, res) => {
  try {
    const { userId, name, ...rest } = req.body;
    if (Object.keys(rest).length > 0) {
      res.status(400).json({
        status: false,
        message: "Invalid request. Only 'userId' and 'name' are allowed.",
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(401).json({ status: false, message: "Invalid User ID" });
      return;
    }

    await User.findOneAndUpdate(
      { _id: userId },
      { $set: { name: name } },
      { new: true }
    );

    res.status(200).json({ status: true, message: "Account Details Updated" });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "You can only update your name.",
    });
  }
});
router.put("/change-password", async (req, res) => {
  try {
    const { userId, currentPassword, newPassword, ...rest } = req.body;
    if (Object.keys(rest).length > 0) {
      res.status(400).json({
        status: false,
        message:
          "Invalid request. Only 'userId', 'current password' and 'new password' are allowed.",
      });
      return;
    }
    const passwordRegex = /^(?=.*\d)(?=.*[a-zA-Z])(?=.*[\W_]).{8,}$/;
    if (!newPassword || !passwordRegex.test(newPassword)) {
      res.status(400).json({
        status: false,
        message:
          "Password must be at least 8 characters long and contain at least one number, one letter, and one symbol",
      });
      return;
    }
    const user = await User.findOne({ _id: userId });
    if (!user) {
      res.status(401).json({ status: false, message: "Invalid User ID" });
      return;
    }
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ status: false, message: "Wrong Current Password" });
    }
    const isPasswordSame = currentPassword === newPassword;
    if (isPasswordSame) {
      return res.status(401).json({
        status: false,
        message: "Current & New Password are same",
      });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate(
      { _id: userId },
      { $set: { password: hashedPassword } },
      { new: true }
    );

    res.status(200).json({ status: true, message: "Password Changed" });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: false,
      message: "Something went wrong, Please try again.",
    });
  }
});
// Update User API Ends
module.exports = router;
