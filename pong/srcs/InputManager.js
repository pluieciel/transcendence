export class InputManager {
	constructor() {
		this.keys = {};
		this.initListeners();
	}

	initListeners() {
		window.addEventListener("keydown", (event) => {
			this.keys[event.key] = true;
		});
		window.addEventListener("keyup", (event) => {
			this.keys[event.key] = false;
		});
		document.addEventListener("contextmenu", (event) => {
			event.stopPropagation();
			return true;
		});
	}

	isKeyPressed(key) {
		return this.keys[key] || false;
	}
}
