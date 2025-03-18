import cloudinary from "../lib/cloudinary.js";
import messageModel from "../models/message.model.js";
import userModel from "../models/user.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUserForSideBar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await userModel.find({ _id: { $ne: loggedInUserId } }).select("-password");


    res.status(200).json(filteredUsers)
  } catch (error) {
    console.error("Error in getUserForSideBar controller", error.message);
    res.status(500).json({ message: "Internal server error" })
  }
}

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await messageModel.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId }
      ]
    })

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;
    let imageUrl = null;

    // Emit the message instantly to speed up UI feedback
    const tempMessage = {
      _id: new Date().getTime().toString(),  // Temporary ID for frontend
      senderId,
      receiverId,
      text,
      image: null,
      createdAt: new Date().toISOString(),
    };
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", tempMessage);
    }

    // Handle image upload in parallel
    if (image) {
      const uploadImage = await cloudinary.uploader.upload(image);
      imageUrl = uploadImage.secure_url;
    }

    // Save to database in the background
    const message = new messageModel({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    message.save().catch((error) => {
      console.log("Message save failed:", error.message);
    });

    // Respond quickly to the frontend
    res.status(201).json(tempMessage);

  } catch (error) {
    console.log("Error in sendMessages controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};