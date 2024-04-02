const mongoose = require("mongoose");
mongoose.connect("mongodb+srv://muneerkoppam1107:vHCbKvYSeaoC2nIO@cluster0.kh0hmhx.mongodb.net/user_management_system");
require('dotenv').config();

const session = require('express-session');
const nocache = require("nocache");

const express = require("express")
const app = express();

const path = require("path")

const flash = require('express-flash');

//session manage
app.use(session({
    secret: 'secret', // Replace with a secret key for session
    resave: true,
    saveUninitialized: true
}));
// clear the cache
app.use(nocache()); //used to prevent browsers or proxies from caching  session data.

app.use(flash());
//for user route
const userRoute = require('./routes/userRoute');
app.use('/',userRoute);

const port=process.env.PORT||5000

//for admin route
const adminRoute = require('./routes/adminRoute');
app.use('/',adminRoute);




app.set('view engine' , 'ejs')
app.set('views',path.join(__dirname,'views'))
app.use(express.static(path.join(__dirname,'public')))

//404 error page
app.use(function(req, res, next) {
    res.status(404).render('users/404');
  });


app.listen(port,function(){
    console.log(`server is running  at http://localhost:${port}/`)
});


