import * as THREE from 'three';

export class ParticleSystem {
	constructor(scene, position = new THREE.Vector3(0, 0, 0)) {
		this.scene = scene;
		this.particles = [];
	}

	getSphere(size = 0.1) {
		const geometry = new THREE.SphereGeometry(size, 4, 4);
		const material = new THREE.MeshBasicMaterial({
			color: 0xffffff,
			transparent: true,
			opacity: 1,
		});
		return new THREE.Mesh(geometry, material);
	}

	getSquare(size = 0.1) {
		const geometry = new THREE.BoxGeometry(size, size, size);
		const material = new THREE.MeshBasicMaterial({
			color: 0xffffff,
			transparent: true,
			opacity: 1,
		});
		return new THREE.Mesh(geometry, material);
	}

	getTriangle(size = 0.2) {
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
			color: 0xffffff,
			transparent: true,
			opacity: 1,
			side: THREE.DoubleSide, // Make triangle visible from both sides
		});

		return new THREE.Mesh(geometry, material);
	}

	createParticle(geometry, velocity, lifetime, size, position) {
		let particle;
		switch (geometry) {
			case "triangle":
				particle = this.getTriangle(size);
				break;
			case "square":
				particle = this.getSquare(size);
				break;
			case "sphere":
				particle = this.getSphere(size);
				break;
			default:
				console.error("Unrecognized particle");
		}

		particle.velocity = new THREE.Vector3((Math.random() - 0.5) * velocity, (Math.random() - 0.5) * velocity, (Math.random() - 0.5) * velocity);
		particle.lifetime = lifetime;
		particle.position.copy(position);

		this.particles.push(particle);
		this.scene.add(particle);
	}

	emit(count, geometry, velocity, lifetime, size, position) {
		for (let i = 0; i < count; i++) {
			this.createParticle(geometry, velocity, lifetime, size, position);
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
