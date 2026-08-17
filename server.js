const express = require("express");

const app = express();

const PORT = process.env.PORT || 8080;

app.use((req, res) => {
  res.status(200).send(
    "LUQMA V8 | REQUEST: " + req.url
  );
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("LUQMA V8 RUNNING ON PORT " + PORT);
});