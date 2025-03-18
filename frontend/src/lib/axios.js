import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: "https://chatter-lyv8.onrender.com/api",
  withCredentials: true,
})