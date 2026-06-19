import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./styles.css";

// React 应用入口：挂载到 index.html 中的 root 节点。
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
