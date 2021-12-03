require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
var MongoDBStore = require("connect-mongodb-session")(session);
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

var usercount;
const app = express();

var store = new MongoDBStore({
  uri: process.env.LOCALLINK || process.env.GLOBALLINK,
  collection: "bmidb",
});
// Catch errors
store.on("error", function (error) {
  res.render("error");
  console.log(error);
});

app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect(process.env.LOCALLINK || process.env.GLOBALLINK, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(
  session({
    secret: process.env.SECRET,
    cookie: {
      httpOnly: false,
      maxAge: 1000 * 60 * 60 * 24 * 1, // 1 Day
    },
    store: store,
    resave: true,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

const dataSchema = new mongoose.Schema({
  username: String,
  heigth: Number,
  weigth: Number,
  bmi: String,
  cvalue: String,
  ivalue: String,
  date: String,
});

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});

userSchema.plugin(passportLocalMongoose);
const User = new mongoose.model("User", userSchema);
const Data = new mongoose.model("Data", dataSchema);

// Intervelled counting for total user count in database
setInterval(function () {
  User.count({}, function (err, count) {
    usercount = count;
  });
}, 0);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app
  .route("/")

  .get((req, res) => {
    res.render("home", { count: usercount });
  })

  .post((req, res, next) => {
    User.findOne({ username: req.body.username }, (err, docs) => {
      if (err) {
        console.log(err);
        res.render("error");
      } else if (docs === null) {
        User.register(
          { username: req.body.username },
          req.body.password,
          (err, user) => {
            if (err) {
              console.log(err);
              res.render("error");
            } else {
              passport.authenticate("local", function (err, user, info) {
                req.logIn(user, function (err) {
                  if (err) {
                    res.render("error");
                    //return next(err);
                  }
                  return res.redirect("/bmicalc");
                });
              })(req, res, next);
            }
          }
        );
      } else {
        passport.authenticate("local", function (err, user, info) {
          if (err) {
            res.render("error");
            //return next(err);
          }
          if (!user) {
            return res.redirect("/");
          }
          req.logIn(user, function (err) {
            if (err) {
              res.render("error");
              //return next(err);
            }
            return res.redirect("/bmicalc");
          });
        })(req, res, next);
      }
    });
  });

app
  .route("/bmicalc")

  .get((req, res) => {
    if (req.isAuthenticated()) {
      Data.find({ username: req.user.username }, function (err, docs) {
        if (err) {
          console.log(err);
          res.render("error");
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

app
  .route("/logout")

  .get((req, res) => {
    req.logout();
    res.redirect("/");
  });

app
  .route("/output")

  .post((req, res) => {
    const we = parseFloat(req.body.weigth);
    const he = parseFloat(req.body.heigth);
    var bmi = ((we / (he * he)) * 10000).toFixed(2);
    var colour, im;

    (function () {
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
    })();

    const data = new Data({
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

let port = process.env.PORT; //heroku PORT
if (port == null || port == "") {
  port = process.env.LOCALPORT; //LOCAL Port
}
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
