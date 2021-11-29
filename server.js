//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

var usercount;
const port = 3000;
const app = express();
const udata = [];

app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userBMIDB", {
  useNewUrlParser: true,
});

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

setInterval(function () {
  User.count({}, function (err, count) {
    usercount = count;
  });
}, 500);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.route("/output").post((req, res) => {
  const we = parseFloat(req.body.weigth);
  const he = parseFloat(req.body.heigth);
  var bmi = (we / (he * he)) * 10000;
  bmi = bmi.toFixed(2);
  var colour, im;
  health();

  function health() {
    if (bmi > 25) {
      colour = "bg-danger";
      im = 3;
      return;
    } else if (18.5 < bmi && bmi < 24.9) {
      colour = "bg-success";
      im = 2;
      return;
    } else {
      colour = "bg-primary";
      im = 1;
      return;
    }
  }

  const userdata = {
    heigth: he,
    weigth: we,
    bmi: bmi,
    cvalue: colour,
    ivalue: im,
    date: new Date().toLocaleString(),
  };
  udata.push(userdata);
  res.redirect("/bmicalc");
});
app.route("/bmicalc").get((req, res) => {
  if (req.isAuthenticated()) {
    res.render("bmicalc", { count: usercount, userdata: udata });
  } else {
    res.redirect("/");
  }
});

app.route("/logout").get((req, res) => {
  req.logout();
  res.redirect("/");
});

app
  .route("/")
  .get((req, res) => {
    res.render("home", { count: usercount });
  })
  .post((req, res, next) => {
    User.findOne({ username: req.body.username }, (err, docs) => {
      if (err) {
        console.log(err);
      } else if (docs === null) {
        User.register(
          { username: req.body.username },
          req.body.password,
          (err, user) => {
            if (err) {
              console.log(err);
              res.redirect("/");
            } else {
              passport.authenticate("local", function (err, user, info) {
                req.logIn(user, function (err) {
                  if (err) {
                    return next(err);
                  }

                  return res.redirect("/bmicalc");
                });
              })(req, res, next);
            }
          }
        );
      } else {
        passport.authenticate("local", function (err, user, info) {
          console.log(info);
          if (err) {
            return next(err);
          }
          if (!user) {
            return res.redirect("/");
          }
          req.logIn(user, function (err) {
            if (err) {
              return next(err);
            }

            return res.redirect("/bmicalc");
          });
        })(req, res, next);
      }
    });
  });

//if (process.env.PORT === null || process.env.PORT === "") {
//   port = 3000;
// } else {
//   port = process.env.PORT;
// }
app.listen(port, () => {
  console.log(`BMI app listening at http://localhost:${port}`);
});
