//import * as THREE from 'three';
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export class ParticleSystem {
	constructor(scene, position = new THREE.Vector3(0, 0, 0)) {
		this.scene = scene;
		this.particles = [];
	}

	getSphere(size = 0.1, color) {
		const geometry = new THREE.SphereGeometry(size, 4, 4);
		const material = new THREE.MeshBasicMaterial({
			color: color,
			transparent: true,
			opacity: 1,
		});
		return new THREE.Mesh(geometry, material);
	}

	getSquare(size = 0.1, color) {
		const geometry = new THREE.BoxGeometry(size, size, size);
		const material = new THREE.MeshBasicMaterial({
			color: color,
			transparent: true,
			opacity: 1,
		});
		return new THREE.Mesh(geometry, material);
	}

	getTriangle(size = 0.2, color) {
		// Create triangle geometry
		const geometry = new THREE.BufferGeometry();
		const vertices = new Float32Array([
			-size,
			-size,
			0, // vertex 1
			size,
			-size,
			0, // vertex 2
			0,
			size,
			0, // vertex 3
		]);
		geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));

		const material = new THREE.MeshBasicMaterial({
			color: color,
			transparent: true,
			opacity: 1,
			side: THREE.DoubleSide, // Make triangle visible from both sides
		});

		return new THREE.Mesh(geometry, material);
	}

	createParticle(geometry, velocity, lifetime, size, position, color) {
		let particle;
		switch (geometry) {
			case "triangle":
				particle = this.getTriangle(size, color);
				break;
			case "square":
				particle = this.getSquare(size, color);
				break;
			case "sphere":
				particle = this.getSphere(size, color);
				break;
			default:
				console.error("Unrecognized particle");
		}

		let angle = Math.random() * Math.PI * 2;
		let length = Math.random() * 0.5;
		particle.velocity = new THREE.Vector3(Math.cos(angle) * velocity * length, Math.sin(angle) * velocity * length, 0);
		particle.lifetime = lifetime;
		particle.position.copy(position);

		this.particles.push(particle);
		this.scene.add(particle);
	}

	emit(count, geometry, velocity, lifetime, size, position, color) {
		for (let i = 0; i < count; i++) {
			if (i % 2 == 0) this.createParticle(geometry, velocity, lifetime, size, position, color);
			else this.createParticle(geometry, velocity, lifetime, size, position, 0xffffff);
		}
	}

	update(deltaTime) {
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const particle = this.particles[i];

			particle.position.add(particle.velocity);

			particle.lifetime -= deltaTime;
			particle.material.opacity = particle.lifetime;

			if (particle.lifetime <= 0) {
				this.scene.remove(particle);
				particle.material.dispose();
				particle.geometry.dispose();
				this.particles.splice(i, 1);
			}
		}
	}
}
