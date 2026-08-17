const express = require("express");

const app = express();

const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send("LUQMA SERVER WORKING V4 ✅");
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    version: "V4",
    message: "Luqma server is working"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Luqma Server V4 running on port ${PORT}`);
});