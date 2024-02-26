const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");
const userRoute = require("./Routes/User");
const noteRoute = require("./Routes/Note");
const path = require("path");

const app = express();
dotenv.config();
app.use(bodyParser.json());

var corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://web-cipherpad.abierta.cloud",
    "https://web-cipherpad.abierta.cloud",
    "https://www.web-cipherpad.abierta.cloud",
    "http://192.168.1.3:3000",
  ],
  optionsSuccessStatus: 200,
};
app.use(express.static(path.join(__dirname, "public")));
app.use(cors(corsOptions));

mongoose.connect(process.env.DB_URL, {
  useUnifiedTopology: true,
});

mongoose.connection.on("connected", () => {
  console.log("Connected to MongoDB");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

app.use("/user", userRoute);
app.use("/note", noteRoute);

const PORT = process.env.PORT || 5002;

app.get("/verify-email", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "verify-email.html"));
});
app.get("/reset-password", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "reset-password.html"));
});
app.get("/data-privacy", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "data-privacy.html"));
});
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.listen(PORT, (req, res) => {
  console.log("Server is up and running");
});
