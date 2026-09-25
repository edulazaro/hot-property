import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Game from "./Game";
import "./index.css";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <Game />
    </StrictMode>,
  );
}
