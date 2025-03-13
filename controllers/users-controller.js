
const HttpError = require("../models/http-error");
const { validationResult } = require("express-validator");
const User = require("../models/user");
const jwt=require('jsonwebtoken');

const getusers = async(req, res, next) => {
    let users;
    try{
         users =await User.find({},'-password');
    }
    catch (err) {
        const error = new HttpError(
          "Fetching users failed,please try again later",500);
        return next(error);
    }

    res.json({users:users.map(user=>user.toObject({getters:true}))});

};

const signup = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data", 422)
    );
  }

  const { name, email, password } = req.body;
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
    
  } catch (err) {
    const error = new HttpError(
      "Signing up failed, please try again later.",
      500
    );
    return next(error);
  }

  if (existingUser) {
    const error = new HttpError(
      "User exists already, please login instead.",
      422
    );
    return next(error);
  }
  const createdUser = new User({
    name,
    email,
    image: req.file.path,
    password,
    places:[]
  });

  try {
    await createdUser.save();
 
    
  } catch (err) {
    const error = new HttpError("Signing up failed. please try again", 500);
    return next(error);
  }
  
  let token;
  try{
   
    token =jwt.sign({userId:createdUser.id,
      email:createdUser.email
    },process.env.KEY,{expiresIn:'1h'});
  }
  catch(err){
    const error = new HttpError("Signing up failed. please try again", 500);
    return next(error);
  }

 // res.status(201).json({ user: createdUser.toObject({ getters: true }) });
 res.status(201).json({ userId:createdUser.id,email:createdUser.email,token:token});
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
    if (!existingUser) {
      return next(new HttpError("User not found. Please sign up first.", 404));
    }
  } catch (err) {
    return next(new HttpError("Logging in failed, please try again later.", 500));
  }

  let isValidPassword;
  try {
    isValidPassword = await existingUser.verifyPassword(password);
  } catch (err) {
    return next(new HttpError("Could not check password, please try again.", 500));
  }

  if (!isValidPassword) {
    return next(new HttpError("Invalid credentials, could not log you in.", 403));
  }
  
  let token;
  try{
    token =jwt.sign({userId:existingUser.id,email:existingUser.email},process.env.KEY,{expiresIn:'1h'});
    
  }
  catch(err){
    const error = new HttpError("Logging up failed. please try again", 500);
    return next(error);
  }

  res.json({ userId:existingUser.id,email:existingUser.email,token:token});
};

module.exports = { getusers, signup, login };
