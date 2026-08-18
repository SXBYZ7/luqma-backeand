const express = require("express");

const app = express();

const PORT = process.env.PORT || 8080;

app.use(express.json());

app.get("/", (req, res) => {

  if (req.query.test === "health") {

    return res.json({
      success: true,
      status: "online",
      version: "V8"
    });

  }

  res.send("LUQMA V8 WORKING ✅");

});

app.listen(PORT, "0.0.0.0", () => {

  console.log(
    "LUQMA V8 RUNNING ON PORT " + PORT
  );

});