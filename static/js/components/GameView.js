import ChatBox from './chat/ChatBox.js';
import { gameinit } from './game/Main.js';

export default class GameView {
    constructor(container) {
        this.container = container;
		const decodedPayload = jwt_decode(window.app.getToken());
        this.username = decodedPayload.username;
		this.render();
	}
	render () {
		new gameinit(this.container);
	}
}