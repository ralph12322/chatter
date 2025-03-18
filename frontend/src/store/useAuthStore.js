import { create } from "zustand"
import { axiosInstance } from "../lib/axios.js"
import toast from 'react-hot-toast';
import { io } from "socket.io-client";

const BASE_URL = "https://chatter-lyv8.onrender.com";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.error("Error in checkAuth:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    try {
      set({ isSigningUp: true });
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Signup successful!");
      get().connectSocket();
    } catch (error) {
      console.error("Error on submitting your info:", error);
      toast.error("Signup failed. username or password has a copy in database");
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");
      get().connectSocket();
    } catch (error) {
      console.error("Error on validating your info:", error);
      toast.error("Login failed. Please check your credentials.");
    } finally {
      set({ isLoggingIn: false });
    }
  },
  
  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout", {}, { withCredentials: true });
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to logout");
    }
  },  

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("error in update profile:", error);
      toast.error(error.response.data.message);
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser, socket } = get();
    if (!authUser) return;
    
    // Avoid creating multiple socket connections
    if (socket && socket.connected) return;
  
    const newSocket = io(BASE_URL, {
      query: { userId: authUser._id },
      transports: ["websocket"],
    });
  
    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
    });
  
    newSocket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
      toast.error("Failed to connect to server.");
    });
  
    newSocket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      if (reason === "io server disconnect") {
        // The disconnection was initiated by the server, so reconnect manually
        newSocket.connect();
      }
    });
  
    newSocket.on("getOnlineUsers", (userIds) => {
      console.log("Online Users:", userIds);
      set({ onlineUsers: userIds });
    });
  
    set({ socket: newSocket });
  },
  
  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      console.log("Socket disconnected manually");
      set({ socket: null, onlineUsers: [] });
    }
  },
  
}));
