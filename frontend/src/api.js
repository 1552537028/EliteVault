import axios from "axios";

const rawBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
const normalizedBaseUrl = rawBaseUrl.replace(/\/+$/, "");

const API = axios.create({
  baseURL: normalizedBaseUrl,
});

export default API;
