const express = require("express");

const app = express();

const PORT = process.env.PORT || 8080;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("LUQMA V6 WORKING ✅");
});

app.get("/health", (req, res) => {
  res.send("HEALTH OK ✅");
});

app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "API OK ✅"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`LUQMA V6 RUNNING ON PORT ${PORT}`);
});