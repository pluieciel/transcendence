import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";

export class TextManager {
	constructor(scene) {
		this.scene = scene;
		this.font = null;
		this.meshes = new Map(); // Store all text meshes with identifiers
		this.positions = {
			scoreLeft: new THREE.Vector3(-1.7, 24.4, -10.4),
			scoreRight: new THREE.Vector3(1.7, 24.4, -10.4),
			nameLeft: new THREE.Vector3(-8.5, 26, -10.4),
			nameRight: new THREE.Vector3(8.5, 26, -10.4),
			eloLeft: new THREE.Vector3(-8.5, 23.5, -10.4),
			eloRight: new THREE.Vector3(8.5, 23.5, -10.4),
		};
		this.colorLeft = null;
		this.colorRight = null;
		this.object = null;
	}

	async initialize(data) {
		await this.loadFont();
		
		await this.createInitialTexts(
			data.player.left.name,
			data.player.right.name,
			"[" + data.player.left.elo.toString() + "]",
			"[" + data.player.right.elo.toString() + "]",
			data.player.left.color,
			data.player.right.color,
		);
	}

	async loadFont() {
		return new Promise((resolve, reject) => {
			const loader = new FontLoader();
			loader.load(
				"https://threejs.org/examples/fonts/helvetiker_regular.typeface.json",
				(font) => {
					this.font = font;
					resolve();
				},
				undefined,
				reject,
			);
		});
	}

	checkTextWidth(testText) {
        const testGeometry = new TextGeometry(testText, {
            font: this.font,
            size: 2,
            height: 0.2,
            curveSegments: 12,
            bevelEnabled: false,
        });
        testGeometry.computeBoundingBox();
        return testGeometry.boundingBox.max.x - testGeometry.boundingBox.min.x;
    }

	createText(text, position, color = 0x00ffff, scale = 1) {
		const maxWidth = 11;
		let displayText = text;
		
		if (this.checkTextWidth(text) * scale > maxWidth) {
			let truncated = text;
			while (truncated.length > 3 && this.checkTextWidth(truncated + "...") * scale > maxWidth) {
				truncated = truncated.slice(0, -1);
			}
			displayText = truncated + "...";
		}
	
		const geometry = new TextGeometry(displayText, {
			font: this.font,
			size: 2,
			height: 0.2,
			curveSegments: 12,
			bevelEnabled: false,
		});
	
		geometry.computeBoundingBox();
		geometry.translate(-geometry.boundingBox.max.x / 2, 0, 0);
	
		const material = new THREE.MeshStandardMaterial({
			color: color,
			metalness: 0,
			roughness: 1,
		});
	
		const mesh = new THREE.Mesh(geometry, material);
		mesh.position.copy(position);
		mesh.scale.set(scale, scale, scale);
		mesh.rotation.x = 0.5;
		mesh.rotation.z = 0;
		return mesh;
	}

	async createInitialTexts(nameLeft, nameRight, eloLeft, eloRight, colorLeft, colorRight) {
		this.colorLeft = colorLeft;
		this.colorRight = colorRight;
		this.updateScore("left", "0");
		this.updateScore("right", "0");

		this.updateText("nameLeft", nameLeft, 0.45);
		this.updateText("nameRight", nameRight, 0.45);
		this.updateText("eloLeft", eloLeft, 0.45);
		this.updateText("eloRight", eloRight, 0.45);
	}

	updateText(id, newText, scale = 1) {
		
		if (this.meshes.has(id)) {
			this.scene.remove(this.meshes.get(id));
		}

		let color;
		if (id.toLowerCase().includes("left")) {
			color = this.colorLeft;
		} else if (id.toLowerCase().includes("right")) {
			color = this.colorRight;
		} else {
			color = 0x00ffff;
		}
		const mesh = this.createText(newText, this.positions[id], color, scale);
		if (id == "eloRight") {
			this.object = mesh;
		}
		this.scene.add(mesh);
		this.meshes.set(id, mesh);
	}

	updateScore(side, score) {
		this.updateText(`score${side.charAt(0).toUpperCase() + side.slice(1)}`, score, 0.9);
	}
}
