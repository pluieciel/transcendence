import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export class BonusType {
	static TABLE = 0;
	static PADDLE = 1;
	static PADDLERED = 2;
	static BALL = 3;
}
export class Bonuses {
	constructor(scene) {
		this.bonusGroup = new THREE.Group();
		this.scene = scene;
		this.tabble = null;
		this.paddle = null;
		this.paddleRed = null;
		this.ball = null;
		this.ballMat = null;
	}

	hidePowerups() {
		if (!this.bonusGroup) {
			console.error("Model group is not initialized.");
			return;
		}
		this.bonusGroup.children.forEach((child) => {
			child.visible = false;
		});
	}

	//displayPowerUp(PowerUp, position) {
	//	this.hidePowerups();
	//	this.bonusGroup.children[BonusType.BUBBLE].visible = true;
	//this.bonusGroup.children[PowerUp].visible = true;
	//	this.bonusGroup.position.set(position.x, position.y, position.z);
	//}
}
