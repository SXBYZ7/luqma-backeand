const express = require("express");

const app = express();

const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send("LUQMA ROOT WORKING");
});

app.get("/abc123", (req, res) => {
  res.send("LUQMA ROUTE WORKING");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("LUQMA RUNNING ON PORT " + PORT);
});