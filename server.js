const express = require("express");

const app = express();

const PORT = process.env.PORT || 8080;

app.get("*", (req, res) => {
  res.status(200).send(
    "LUQMA V5 | PATH: " + req.path
  );
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("LUQMA V5 RUNNING ON PORT " + PORT);
});