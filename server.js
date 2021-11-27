const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const ejs = require("ejs");

const port = 3000;
const data = {
  weight: Number,
};

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

app.route("/").get((req, res) => {
  //console.log(req);
  res.render("partials/signin");
});

// if(process.env.PORT === null || process.env.PORT === " ") {
//   port = 3000;
// } else {
//   port = process.env.PORT;
// }
app.listen(port, () => {
  console.log(`BMI app listening at http://localhost:${port}`);
});
