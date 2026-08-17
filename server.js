const express = require("express");

const app = express();

const PORT = process.env.PORT || 8080;

app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).send("LUQMA V4 WORKING ✅");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "online",
    version: "V4"
  });
});

app.get("/api/test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API WORKING ✅"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("LUQMA SERVER RUNNING ON PORT " + PORT);
});