class Vector {
	x;
	y;
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
}

class Player {
	pos;
	color;
	width;
	height;
	bottomPlayer;
	constructor(x, y, color, width, height, position) {
		this.pos = new Vector(x, y);
		this.color = color;
		this.width = width;
		this.height = height;
		this.bottomPlayer = position;
	}
	insideHitbox(pos) {
		return (
			pos.x >= this.pos.x &&
			pos.x <= this.pos.x + this.width &&
			pos.y >= this.pos.y &&
			pos.y <= this.pos.y + this.height
		);
	}
}

import * as THREE from "three";
console.log(THREE);
const scene = new THREE.Scene();
const canvas = document.getElementById("myCanvas");
resizeCanvas();
const ctx = canvas.getContext("2d");
let x = canvas.width / 2;
let y = canvas.height;
let p1 = new Player(0, 20, "#F00", 200, 50, false);
let p2 = new Player(0, y - 50 - 20, "#F00", 200, 50, true);

let moveLeft = false;
let moveRight = false;

window.addEventListener("keydown", function (event) {
	if (event.key === "ArrowLeft") {
		moveLeft = true;
	} else if (event.key === "ArrowRight") {
		moveRight = true;
	}
});

window.addEventListener("keyup", function (event) {
	if (event.key === "ArrowLeft") {
		moveLeft = false;
	} else if (event.key === "ArrowRight") {
		moveRight = false;
	}
});

function resizeCanvas() {
	canvas.width = window.innerWidth * 0.8;
	canvas.height = window.innerHeight * 0.8;
}

function exec() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	if (moveLeft) p1.pos.x -= 5;
	if (moveRight) p1.pos.x += 5;
	draw(p1);
	draw(p2);
}

function draw(player) {
	ctx.beginPath();
	const depth = 10; // Adjust for how "deep" the 3D effect should look

	ctx.fillStyle = "#555"; // Shadow color
	ctx.fillRect(
		player.pos.x + 5,
		player.pos.y + 5,
		player.width,
		player.height,
	);

	// Main rectangle (lighter color)
	ctx.fillStyle = player.color;
	ctx.fillRect(player.pos.x, player.pos.y, player.width, player.height);

	ctx.closePath();
}

setInterval(exec, 10);
