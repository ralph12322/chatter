import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";
import userModel from "../models/user.model.js";
import bcrypt from 'bcryptjs';

export const signup = async (req, res) => {
  const {fullName, email, password} = req.body
  try {
    
    if(!fullName || !email || !password){
      return res.status(400).json({message: "All fields are required"})
    }

    const dup = await userModel.findOne({fullName});

    if(dup){
      return res.status(400).json({message: "The username is already in the database"})
    }

    if(password.length < 6){
      return res.status(400).json({message: "Password must at least 6 characters"});
    }

    const user = await userModel.findOne({email});

    if(user){
      return res.status(400).json({message: "User already exist!"});
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt)

    const newUser = new userModel({
      fullName,
      email,
      password: hashedPassword,
    })

    if(newUser){

      generateToken(newUser._id, res);
      await newUser.save();

      res.status(201).json({
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        profilePic: newUser.profilePic
      });

    } else{
      res.status(400).json({message: "Invalid User data"})
    }

  } catch (error) {
    console.log("Error in sigup controller", error.message);
    res.status(500).json({message: "Internal Server Error"})
  }
}

export const login = async (req, res) => {
  
  const {email, password} = req.body

  try {
    const user = await userModel.findOne({email});

    if(!user){
      return res.status(400).json({message: "There's no such user!"})
    }

    const pass = await bcrypt.compare(password, user.password)
    if(!pass){
      return res.status(400).json({message: "Password is incorrect!"})
    }

    generateToken(user._id, res)

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email : user.email,
      profilePic: user.profilePic
    })

    
  } catch (error) {
    console.log("Error in log in controller", error.message)
    res.status(500).json({message: "Server internal Error"})
  }
};

export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", {
      httpOnly: true,
      secure: true,  // Set to true if you're using HTTPS (like Vercel)
      sameSite: "Lax",
      maxAge: 0
    });
    
    res.status(200).json({message: "Logged out Successfully"})
  } catch (error) {
    console.log("Error in logout controller")
    res.status(500).json({message: "Internal server error"})
  }
};

export const updateProfile = async (req, res) => {
  try {
    const{profilePic} = req.body
    const userId = req.user._id

    if(!profilePic){
      return res.status(400).json({message: "There's no image provided"})
    }

    const uploadResponse = await cloudinary.uploader.upload(profilePic)
    const updatedUser = await userModel.findByIdAndUpdate(userId, {profilePic: uploadResponse.secure_url}, {new: true})

    res.status(200).json(updatedUser)
  } catch (error) {
    console.log("error in update profile: ", error);
    res.status(500).json({message: "Iternal server error"})
  }
}

export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth Controller", error.message);
    res.status(500).json({message: "Internal server error"})
  }
}