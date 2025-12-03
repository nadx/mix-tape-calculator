// Initialize OpenTelemetry before anything else
import "./telemetry";

import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.tsx";
import Redirect from "./pages/Redirect.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/redirect" element={<Redirect />} />
    </Routes>
  </BrowserRouter>
);
  