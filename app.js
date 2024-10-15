//just want to add one more functionality , when user is already logged in using OAuth, then if user is registering manualy,
// the password should get updated on the same email in the database, right now we cannot login using manual if user is already logged in using OAuth 


require("dotenv").config();
const express = require("express");

const ejs = require("ejs");

const bodyParser = require("body-parser");

const app = express();

const mongoose = require("mongoose");

cors

app.use(express.json());
const session= require('express-session');
const passportLocalMongoose= require('passport-local-mongoose');
const passport= require('passport');
const findOrCreate= require('mongoose-findorcreate');

const GoogleStrategy= require('passport-google-oauth20').Strategy;
const LinkedinStrategy= require('passport-linkedin-oauth2').Strategy;

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

//const bcryptjs = require("bcryptjs");
//const saltRounds=10;

//const md5=require('md5');
//const encrypt= require('mongoose-encryption');
app.use(session({
  secret : 'helloeveryone',
  saveUninitialized : false,
  resave : false
}));

app.use(passport.initialize());
app.use(passport.session());

const DB=process.env.DATABASE;
mongoose.connect(DB)
.then(()=>{
  console.log("DB connected");
}).catch((err)=>{
  console.log(err);
});

const userSchema = new mongoose.Schema({
  email: String,
  googleId : String,
  secret : String,
  linkedinId : String
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


//userSchema.plugin(encrypt,{secret:process.env.SECRET, encryptedFields:['password']});

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { id: user.id, username: user.username });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});


passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
async (accessToken, refreshToken, profile, cb) => {
  try {
    
      const existingUser = await User.findOne({ username: profile.emails[0].value });
      
      if (existingUser) {
         
          if (!existingUser.googleId) {
              existingUser.googleId = profile.id;
              await existingUser.save(); 
          }
          return cb(null, existingUser); 
      } else {
          
          const newUser = new User({
              googleId: profile.id,
              username: profile.emails[0].value,
             
          });

          await newUser.save(); 
          return cb(null, newUser); 
      }
  }catch (err) {
      return cb(err, null);
  }
}));
passport.use(new LinkedinStrategy({
  clientID: process.env.LINKEDIN_CLIENT_ID,
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/linkedin/secrets",
  scope: ['email','profile','openid'],
   
},
async (accessToken, refreshToken, profile, cb) => {
  try {
    
      const existingUser = await User.findOne({ username: profile.email});
      
      if (existingUser) {
         
          if (!existingUser.linkedinId) {
              existingUser.linkedinId = profile.id;
              await existingUser.save(); 
          }
          return cb(null, existingUser); 
      } else {
          
          const newUser = new User({
              linkedinId: profile.id,
              username: profile.email,
             
          });

          await newUser.save(); 
          return cb(null, newUser); 
      }
  }catch (err) {
      return cb(err, null);
  }
}));

app.get("/", (req, res) => {
  res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get("/auth/google/secrets", passport.authenticate("google", {failureRedirect: "/login"}),
      (req,res)=>{
      res.redirect("/secrets");
    }
);
app.get("/auth/linkedin", 
  passport.authenticate('linkedin', {state : "state2" })
);

app.get("/auth/linkedin/secrets", 
  passport.authenticate("linkedin", { failureRedirect: "/login" }),
  (req, res) => {
    // Successful authentication, redirect to secrets.
    res.redirect("/secrets");
  }
);
app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get('/secrets',(req,res)=>{

  User.find({"secret" : {"$ne" : null }})
    .then((foundUsers)=>{
      res.render("secrets", {secretUsers : foundUsers})
    })
    .catch((err)=>{
      console.log(err);
    })

});

app.get('/logout',(req,res)=>{
  req.logout((err)=>{
    if(err)
    console.log(err);
  });

  res.redirect('/');
});

app.get("/submit",(req,res)=>{
   if(req.isAuthenticated()){
    res.render("submit");
   }
   else
   res.redirect("login");
})

app.post("/register", (req, res) => {

    User.register({username : req.body.username},req.body.password)
    .then(()=>{
      passport.authenticate("local")(req,res, ()=>{
        res.redirect('/secrets');
      });

    })
    .catch((err)=>{
      console.log("User is already exists");
      res.redirect('/register');
    })



});

app.post("/login", (req, res) => {
  
    const user= new User({
      username : req.body.username
    })
    req.login(user, (err)=>{
        if(err)
          console.log(err);


        else{
          passport.authenticate('local')(req,res,()=>{
            res.redirect('/secrets');
        });
      }  
});
});

app.post("/submit",(req,res)=>{
    
    const submittedSecret= req.body.secret;
    
    User.findById(req.user.id)
   .then((foundUser)=>{
    foundUser.secret=submittedSecret;
    foundUser.save()
    .then(()=>{
      res.redirect("/secrets");
    })
    .catch((err)=>{
      console.log(err);
    })

    
   })
   .catch((err)=>{
    console.log(err);
   })

});

app.listen(process.env.PORT || 3000, (req, res) => {
  console.log(`server is running on ${process.env.PORT || 3000}`);
});
