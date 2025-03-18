import jwt from 'jsonwebtoken';
import userModel from '../models/user.model.js';
import dotenv from 'dotenv'
dotenv.config()

export const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;

    if(!token){
      return res.status(401).json({message: "Unauthorized - No Token Provided"})
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if(!decoded){
      return res.status(401).json({message: "Unauthorized - Invalid Token"})
    }

    const user = await userModel.findById(decoded.userId).select("-password");

    if(!user){
      return res.status(401).json({message: "User not Found"})
    }

    req.user = user;
    next();
  } catch (error) {
    console.log("Error in Protect Route Middleware", error.message)
    res.status(500).json({message: "Internal Server Error"})
  }
}