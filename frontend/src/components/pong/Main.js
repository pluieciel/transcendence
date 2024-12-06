import { Game } from "./Game.js";


export function gameinit(canvas) {
    if (!canvas) {
        console.error("Canvas element is not provided");
        return;
    }
    const game = new Game(canvas);
    game.initialize();
}
