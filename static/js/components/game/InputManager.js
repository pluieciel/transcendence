export class InputManager {
	constructor(ws) {
		this.keys = {};
		this.lastKeyPressed = null;
		this.ws = ws;
		this.initListeners();
	}

	initListeners() {
		window.addEventListener("keydown", (event) => {
			if (!this.keys[event.key]) {

				this.keys[event.key] = true;
				if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "w" || event.key === "s" || event.key === "W" || event.key === "S" || event.key === "Z" || event.key === "z") {
					this.sendKeyEvent("keydown", event.key);
					if (event.key === "ArrowUp" || event.key === "ArrowDown")
					{
						event.preventDefault();
					}
					
				}
			}
		});

		window.addEventListener("keyup", (event) => {
			if (this.keys[event.key]) {
				this.keys[event.key] = false;
				if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "w" || event.key === "s" || event.key === "W" || event.key === "S" || event.key === "Z" || event.key === "z") {
					if (event.key === "ArrowUp" || event.key === "ArrowDown")
					{
						event.preventDefault();
					}
					this.sendKeyEvent("keyup", event.key);
				}
			}
		});
	}

	sendKeyEvent(type, key) {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			if (key === 'w' || key === 'z' || key === 'Z') 
			{
				key = 'W'
			}
			if (key === 's')
			{
				key = 'S'
			}
			 // Debug log
			this.ws.send(
				JSON.stringify({
					type: type,
					key: key,
				}),
			);
			console.log(JSON.stringify({
				type: type,
				key: key,
			}),
		)
		}
	}

	dispose() {
		window.removeEventListener("keydown", this.keydownListener);
		window.removeEventListener("keyup", this.keyupListener);
	}
}
