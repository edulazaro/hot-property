import { createMusic } from "../shell/music";
import theme1 from "./theme-1.mp3";
import theme2 from "./theme-2.mp3";

/** Background music, played only while a game is running. */
export const music = createMusic([theme1, theme2], { volume: 0.3, storageKey: "hot-property-music" });
