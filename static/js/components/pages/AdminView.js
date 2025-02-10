export default class AdminView {
    constructor(container) {
        this.container = container;
		this.render()
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
				await window.app.getSettings();
				this.container.innerHTML = data.admin_view;
				window.app.checkForAdmin();
				this.addEventListeners();
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
