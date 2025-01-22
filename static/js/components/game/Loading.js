export class Loading {
	constructor() {
		this.components = new Map();
		this.onComplete = null;
	}

	addComponent(name) {
		const promise = new Promise((resolve) => {
			this.components.set(name, { ready: false, resolve });
		});
		return promise;
	}

	setComponentReady(name) {
		const component = this.components.get(name);
		if (component) {
			component.ready = true;
			component.resolve();
			this.checkAllComplete();
		}
	}

	checkAllComplete() {
		const allReady = Array.from(this.components.values()).every((c) => c.ready);
		if (allReady && this.onComplete) {
			this.onComplete();
		}
	}
}
