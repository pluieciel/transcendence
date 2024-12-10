import ChatBox from './chat/ChatBox.js';
import { gameinit } from './game/Main.js';

export default class GameView {
    constructor(container, appState) {
        this.container = container;
        this.username = appState.username;
		this.render();
	}
	render () {
		new gameinit(this.container);
	}
}