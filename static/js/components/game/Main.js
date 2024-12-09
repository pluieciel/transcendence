import { Game } from "./Game.js";


export function gameinit(container) {
    if (!container) {
        console.error("Container element is not provided");
        return;
    }
    container.innerHTML = '<canvas id="gameCanvas"></canvas>';
    const canvas = container.querySelector('#gameCanvas');
    const game = new Game(canvas);
    game.initialize();
}
