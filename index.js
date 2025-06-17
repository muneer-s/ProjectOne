require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const nocache = require("nocache");
const flash = require("express-flash");
const path = require("path");
const userRoute = require("./routes/userRoute");
const adminRoute = require("./routes/adminRoute");



const app = express();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

//session manage
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
  })
);
app.use(nocache()); // Prevent caching of session data
app.use(flash());


// Set view engine and static files
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));


app.use("/", userRoute);
app.use("/", adminRoute);


//404 error
app.use(function (req, res, next) {
  res.status(404).render("users/404");
});

const port = process.env.PORT || 5000;

app.listen(port, function () {
  console.log(`server is running  at localhost:${port}`);
});
