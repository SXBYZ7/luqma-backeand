const express = require("express");

const app = express();

const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send("LUQMA ROOT V5");
});

app.get("/health", (req, res) => {
  res.send("HEALTH WORKING V5");
});

app.get("/test123", (req, res) => {
  res.send("TEST123 WORKING V5");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("LUQMA V5 RUNNING ON PORT " + PORT);
});