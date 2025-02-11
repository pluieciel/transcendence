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
				await window.app.renderHeader(this.container, "admin");
				this.container.innerHTML += data.admin_view;
				this.addEventListeners();
			} else if (response.status == 401 && !data.is_jwt_valid) {
				window.app.logout();
				window.app.router.navigateTo("/login");
			} else if (response.status == 409) {
				// TODO: show error msg
			} else {
				// TODO: show error msg
			}
		} catch (error) {
			console.log('An error occurred: ' + error);
		}
    }

    addEventListeners() {
		window.app.addNavEventListeners();
		const elasticsearchBtn = document.getElementById("elasticsearch-button");
		const kibanaBtn = document.getElementById("kibana-button");
		const nodeExporterBtn = document.getElementById("node-exporter-button");
		const cadvisorBtn = document.getElementById("cadvisor-button");
		const prometheusBtn = document.getElementById("prometheus-button");
		const grafanaBtn = document.getElementById("grafana-button");

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
