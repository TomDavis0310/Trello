import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// === Entry point ===
// Điểm vào chính của ứng dụng React. Tạo root DOM và render component `<App />`
// bên trong `<StrictMode>` để kích hoạt các kiểm tra trong môi trường development.
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
