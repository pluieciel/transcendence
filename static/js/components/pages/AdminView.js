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
				window.app.renderHeader(this.container, "admin");
				this.container.innerHTML += `
					<main id="admin-view">
						<div class="card service-card">
							<h2 id="card-title">
								<img src="/imgs/elasticsearch_logo.webp" alt="Elasticsearch logo" class="service-logo"> ELASTICSEARCH
							</h2>
							<p class="service-description">Search and analytics engine for all application logs and metrics.</p>
							<button id="elasticsearch-button" class="service-button">Go to Elasticsearch</button>
						</div>
						<div id="service-card" class="card">
							<h2 id="card-title">
								<img src="/imgs/kibana_logo.webp" alt="Kibana logo" class="service-logo"> KIBANA
							</h2>
							<p class="service-description">Visualization dashboard for Elasticsearch data and log analysis.</p>
							<button id="kibana-button" class="service-button">Go to Kibana</button>
						</div>
						<div id="service-card" class="card">
							<h2 id="card-title">
								<img src="/imgs/cadvisor_logo.webp" alt="cAdvisor logo" class="service-logo"> CADVISOR
							</h2>
							<p class="service-description">Container resource usage and performance analyzer.</p>
							<button id="cadvisor-button" class="service-button">Go to cAdvisor</button>
						</div>
						<div id="service-card" class="card">
							<h2 id="card-title">
								<i class="fa-solid fa-file-export fa-xs"></i> NODE EXPORTER
							</h2>
							<p class="service-description">Hardware and OS metrics exporter for system monitoring.</p>
							<button id="node-exporter-button" class="service-button">Go to Node Exporter</button>
						</div>
						<div id="service-card" class="card">
							<h2 id="card-title">
								<img src="/imgs/prometheus_logo.webp" alt="Prometheus logo" class="service-logo"> PROMETHEUS
							</h2>
							<p class="service-description">Time series database for metrics collection and alerting.</p>
							<button id="prometheus-button" class="service-button">Go to Prometheus</button>
						</div>
						<div id="service-card" class="card">
							<h2 id="card-title">
								<img src="/imgs/grafana_logo.webp" alt="Grafana logo" class="service-logo"> GRAFANA
							</h2>
							<p class="service-description">Metrics visualization and monitoring dashboard platform.</p>
							<button id="grafana-button" class="service-button">Go to Grafana</button>
						</div>
					</main>
				`;
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
