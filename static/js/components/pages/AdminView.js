export default class AdminView {
    constructor(container) {
        this.container = container;
		this.render();
    }
	
	async getSettings() {
		if (!window.app.settings['fetched'])
			await window.app.getPreferences();
		if (window.app.settings.is_admin) {
			const adminButton = document.getElementById("admin-button");
			adminButton.style.display = "block";
		}
	}

    async render() {
		try {
			const response = await fetch('/api/admin', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
			});

			const data = await response.json();
			if (data.success) {
				this.container.innerHTML = data.admin_view;
				this.addEventListeners();
				await this.getSettings();
			} else if (response.status == 409) {
				console.log(data.message);
			} else {
				console.log(data.message);
			}
		} catch (error) {
			console.log('An error occurred: ' + error);
		}
    }

    addEventListeners() {
		window.app.addNavEventListeners();
		const elasticsearchBtn = document.getElementById("elasticsearchBtn");
		const kibanaBtn = document.getElementById("kibanaBtn");
		const nodeExporterBtn = document.getElementById("nodeExporterBtn");
		const cadvisorBtn = document.getElementById("cadvisorBtn");
		const prometheusBtn = document.getElementById("prometheusBtn");
		const grafanaBtn = document.getElementById("grafanaBtn");

		elasticsearchBtn.addEventListener("click", () => {
			window.location.href = "/admin/services/elasticsearch";
        });

		kibanaBtn.addEventListener("click", () => {
			window.location.href = "/admin/services/kibana";
		});

		nodeExporterBtn.addEventListener("click", () => {
			window.location.href = "/admin/services/node-exporter";
		});

		cadvisorBtn.addEventListener("click", () => {
			window.location.href = "/admin/services/cadvisor";
		});

		prometheusBtn.addEventListener("click", () => {
			window.location.href = "/admin/services/prometheus";
		});

		grafanaBtn.addEventListener("click", () => {
			window.location.href = "/admin/services/grafana";
		});
	}
}
