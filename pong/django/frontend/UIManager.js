export class UIManager {
	constructor() {
		this.playerLeftScore = null;
		this.playerLeftName = null;
		this.playerRightScore = null;
		this.playerRightName = null;
		this.overlay = null;
		this.createUIElements();
	}

	createUIElements() {
		this.createTexts();
		this.createOverlay();
	}

	createTexts() {
		const commonStyles = {
			position: "absolute",
			color: "white",
			userSelect: "none",
		};

		var scoreLeft = document.createElement("div");
		scoreLeft.style.position = "absolute";
		scoreLeft.style.color = "white";
		scoreLeft.style.outlineColor = "0x0000";
		scoreLeft.style.width = 100;
		scoreLeft.style.height = 100;
		scoreLeft.style.fontSize = "100px";
		scoreLeft.style.userSelect = "none";
		scoreLeft.innerHTML = "0";
		scoreLeft.style.top = 50 + "px";
		scoreLeft.style.left = 1200 + "px";
		document.body.appendChild(scoreLeft);
		this.playerLeftScore = scoreLeft;

		var scoreRight = document.createElement("div");
		scoreRight.style.position = "absolute";
		scoreRight.style.color = "white";
		scoreRight.style.outlineColor = "0xffffff";
		scoreRight.style.width = 100;
		scoreRight.style.height = 100;
		scoreRight.style.userSelect = "none";
		scoreRight.style.fontSize = "100px";
		scoreRight.innerHTML = "0";
		scoreRight.style.top = 50 + "px";
		scoreRight.style.right = 1200 + "px";
		document.body.appendChild(scoreRight);
		this.playerRightScore = scoreRight;

		var nameLeft = document.createElement("div");
		nameLeft.style.position = "absolute";
		nameLeft.style.color = "white";
		nameLeft.style.outlineColor = "0xffffff";
		nameLeft.style.width = 100;
		nameLeft.style.height = 100;
		nameLeft.style.fontSize = "50px";
		nameLeft.style.userSelect = "none";
		nameLeft.innerHTML = "Julien [2057]";
		nameLeft.style.top = 170 + "px";
		nameLeft.style.left = 1100 + "px";
		document.body.appendChild(nameLeft);
		this.playerLeftName = nameLeft;

		var nameRight = document.createElement("div");
		nameRight.style.position = "absolute";
		nameRight.style.color = "white";
		nameRight.style.outlineColor = "0xffffff";
		nameRight.style.width = 100;
		nameRight.style.userSelect = "none";
		nameRight.style.height = 100;
		nameRight.style.fontSize = "50px";
		nameRight.innerHTML = "Test [1201]";
		nameRight.style.top = 170 + "px";
		nameRight.style.right = 1100 + "px";
		document.body.appendChild(nameRight);
		this.playerRightName = nameRight;
	}

	createOverlay() {
		const overlay = document.createElement("div");
		overlay.style.position = "fixed";
		overlay.style.top = "0";
		overlay.style.left = "0";
		overlay.style.width = "100%";
		overlay.style.height = "100%";
		overlay.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
		overlay.style.display = "flex"; // Start as flex instead of none
		overlay.style.justifyContent = "center";
		overlay.style.alignItems = "center";
		overlay.style.color = "white";
		overlay.style.fontSize = "48px";
		overlay.style.fontFamily = "Arial, sans-serif";
		overlay.style.zIndex = "1000"; // Make sure it's above other elements
		overlay.innerText = "Waiting for server...";
		document.body.appendChild(overlay);
		this.overlay = overlay;
	}

	setOverlayVisibility(visible) {
		this.overlay.style.display = visible ? "flex" : "none";
	}
	setOverText(text) {
		this.overlay.innerHTML = text;
	}

	setTextsVisibility(visible) {
		if (visible) {
			if (this.playerLeftScore) this.playerLeftScore.style.display = "block";
			if (this.playerRightScore) this.playerRightScore.style.display = "block";
			if (this.playerLeftName) this.playerLeftName.style.display = "block";
			if (this.playerRightName) this.playerRightName.style.display = "block";
		} else {
			if (this.playerLeftScore) this.playerLeftScore.style.display = "none";
			if (this.playerRightScore) this.playerRightScore.style.display = "none";
			if (this.playerLeftName) this.playerLeftName.style.display = "none";
			if (this.playerRightName) this.playerRightName.style.display = "none";
		}
	}

	updateScoreLeft(score) {
		this.playerLeftScore.innerHTML = score;
	}

	updateScoreRight(score) {
		this.playerRightScore.innerHTML = score;
	}

	updateNameLeft(name) {
		this.playerLeftName.innerHTML = name;
	}

	updateNameRight(name) {
		this.playerRightName.innerHTML = name;
	}
}
