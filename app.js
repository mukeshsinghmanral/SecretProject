require('dotenv').config();
const express=require('express');

const ejs=require('ejs');

const bodyParser=require('body-parser');


const app=express();

const mongoose=require('mongoose');
const encrypt= require('mongoose-encryption');
mongoose.connect("mongodb://127.0.0.1:27017/userDB");

const userSchema=new mongoose.Schema({
    email : String,
    password : String
});

userSchema.plugin(encrypt,{secret:process.env.SECRET, encryptedFields:['password']});

const User=new mongoose.model('User',userSchema);

app.use(express.static('public'));
app.use(express.urlencoded({extended : true}));
app.set('view engine','ejs');

app.get('/',(req,res)=>{
    res.render('home');
});

app.get('/login',(req,res)=>{
    res.render('login');
});

app.get('/register',(req,res)=>{
    res.render('register');
});

app.post('/register', (req,res)=>{
    const newUser= new User({
        email : req.body.username,
        password : req.body.password
    })
    newUser.save()
    .then(()=>{
        res.render('secrets');
    })
    .catch((err)=>{
        console.log(err);
    })
        
    

});


app.post('/login',(req,res)=>{
    const username=req.body.username; 
    const password=req.body.password;

    User.findOne({email : username})
    .then((found)=>{
        if(found.password===password)
            res.render('secrets');
        else{
        console.log('Incorrect Password');
        res.redirect('/login');
        }
    }).catch((err)=>{
        console.log('User not Found');
        res.redirect('/login');
    
    })

});


app.get('/logout',(req,res)=>{
    res.render('home');
});





const PORT=3000;
app.listen(PORT,(req,res)=>{

    console.log(`server is running on ${PORT}`);

})


