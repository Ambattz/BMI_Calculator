const express = require("express");
const bodyParser = require("body-parser");
var path = require("path");
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));
const port = 3000;

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.post("/", (req, res) => {
  var h = req.body.height / 100;
  var w = req.body.weight;
  var bmi = "BMI = " + (w / Math.pow(h, 2)).toFixed(2);
  res.send(bmi);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
