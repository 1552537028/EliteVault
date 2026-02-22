import axios from "axios";

const rawBaseUrl = import.meta.env.VITE_API_URL || "https://elitevault-backend.onrender.com";
const normalizedBaseUrl = rawBaseUrl.replace(/\/+$/, "");

const API = axios.create({
  baseURL: normalizedBaseUrl,
});

export default API;
