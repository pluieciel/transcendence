export class InputManager {
	constructor() {
		this.keys = {};
		this.lastKeyPressed = null;
		this.ws = null;
		this.initListeners();
	}

	initListeners() {
		window.addEventListener("keydown", (event) => {
			if (!this.keys[event.key]) {
				this.keys[event.key] = true;
				if (event.key === "ArrowUp" || event.key === "ArrowDown") {
					event.preventDefault(); // Prevent page scrolling
					this.sendKeyEvent("keydown", event.key);
				}
			}
		});

		window.addEventListener("keyup", (event) => {
			if (this.keys[event.key]) {
				this.keys[event.key] = false;
				if (event.key === "ArrowUp" || event.key === "ArrowDown") {
					event.preventDefault(); // Prevent page scrolling
					this.sendKeyEvent("keyup", event.key);
				}
			}
		});
	}

	sendKeyEvent(type, key) {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			console.log(`Sending key event: ${type} ${key}`); // Debug log
			this.ws.send(
				JSON.stringify({
					type: type,
					key: key,
				}),
			);
		}
	}
}
