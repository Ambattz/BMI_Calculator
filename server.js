//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const path = require("path");
const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const session = require("cookie-session");
const MongoStore = require("connect-mongo");

const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

var usercount;
var data;
const app = express();

app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SECRET,
    store: MongoStore.create({ mongoUrl: process.env.LINK }),
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.LINK, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const dataSchema = new mongoose.Schema({
  username: String,
  heigth: {
    type: Number,
  },
  weigth: {
    type: Number,
  },
  bmi: String,
  cvalue: String,
  ivalue: String,
  date: String,
});

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});

userSchema.plugin(mongoosePaginate);
userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);
const UserData = new mongoose.model("UserData", dataSchema);

setInterval(function () {
  User.count({}, function (err, count) {
    usercount = count;
  });
}, 0);

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

  const data = new UserData({
    username: req.user.username,
    heigth: he,
    weigth: we,
    bmi: bmi,
    cvalue: colour,
    ivalue: im,
    date: new Date().toLocaleString(),
  });
  data.save();
  res.redirect("/bmicalc");
});
app.route("/bmicalc").get((req, res) => {
  if (req.isAuthenticated()) {
    UserData.find({ username: req.user.username }, function (err, docs) {
      if (err) {
        console.log(err);
      } else {
        res.render("bmicalc", {
          count: usercount,
          username: req.user.username,
          userdata: docs,
        });
      }
    });
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
                  // return res.redirect("/bmicalc");
                  res.render("bmicalc", {
                    count: usercount,
                    username: req.user.username,
                    userdata: docs,
                  });
                });
              })(req, res, next);
            }
          }
        );
      } else {
        passport.authenticate("local", function (err, user, info) {
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

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port);
