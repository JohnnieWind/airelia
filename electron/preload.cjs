const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("airelia", {
  apiUrl: process.env.AIRELIA_API_URL ?? "http://localhost:8080"
});

