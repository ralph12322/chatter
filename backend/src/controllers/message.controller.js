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
    const { page = 1, limit = 20 } = req.query;

    const messages = await messageModel
      .find({
        $or: [
          { senderId: myId, receiverId: userToChatId },
          { senderId: userToChatId, receiverId: myId }
        ]
      })
      .sort({ createdAt: 1 }) // Recent messages first
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    // Emit instantly for UI responsiveness
    const tempMessage = {
      _id: new Date().getTime().toString(),
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

    // Respond instantly, don't wait for uploads or DB saves
    res.status(201).json(tempMessage);

    // Background: Upload + Save
    (async () => {
      let imageUrl = null;
      if (image) {
        const uploadResult = await cloudinary.uploader.upload(image, {
          eager: [{ width: 300, height: 300, crop: "scale" }],
          timeout: 5000,
        });
        imageUrl = uploadResult.secure_url;
      }

      // Save to DB without blocking the frontend
      await messageModel.create({
        senderId,
        receiverId,
        text,
        image: imageUrl,
      });

      // Optional: Emit again with the saved message (if necessary)
      const savedMessage = await messageModel.findOne({ senderId, receiverId, text }).sort({ createdAt: -1 });
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("newMessage", savedMessage);
      }
    })();
  } catch (error) {
    console.log("Error in sendMessages controller:", error.message);
  }
};
