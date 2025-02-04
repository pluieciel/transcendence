export default class MainView {
    constructor(container) {
        this.container = container;
		this.render();
		this.addEventListeners();
		this.getSettings();
    }

	async getSettings() {
		if (!window.app.settings.fetched)
			await window.app.getPreferences();
		this.settings = {
			color: window.app.settings.color,
			quality: window.app.settings.quality
		};
		return ;
	}

    render() {
        this.container.innerHTML = `
			<header>
				<h1 id="pong">PONG</h1>
				<button id="indexAdminBtn">Main</button>
				<button id="settingsBtn">Settings</button>
				<button id="logoutBtn">Log out</button>
			</header>
			<div class="welcome">
				<p>Welcome to your admin dashboard, you can access all monitoring services here!</p>
			</div>
			<div id="services">
				<div class="service redHover">
					<div class="service-header">
						<h3>Elasticsearch</h3>
						<img src="/imgs/elasticsearch_logo.webp" alt="Elasticsearch logo" class="service-logo">
					</div>
					<p class="service-description">Search and analytics engine for all application logs and metrics.</p>
					<button id="elasticsearchBtn">Go to Elasticsearch</button>
				</div>
				<div class="service redHover">
					<div class="service-header">
						<h3>Kibana</h3>
						<img src="/imgs/kibana_logo.webp" alt="Kibana logo" class="service-logo">
					</div>
					<p class="service-description">Visualization dashboard for Elasticsearch data and log analysis.</p>
					<button id="kibanaBtn">Go to Kibana</button>
				</div>
				<div class="service redHover">
					<div class="service-header">
						<h3>cAdvisor</h3>
						<img src="/imgs/cadvisor_logo.webp" alt="cAdvisor logo" class="service-logo">
					</div>
					<p class="service-description">Container resource usage and performance analyzer.</p>
					<button id="cadvisorBtn">Go to cAdvisor</button>
				</div>
				<div class="service redHover">
					<div class="service-header">
						<h3>Node Exporter</h3>
					</div>
					<p class="service-description">Hardware and OS metrics exporter for system monitoring.</p>
					<button id="nodeExporterBtn">Go to Node Exporter</button>
				</div>
				<div class="service redHover">
					<div class="service-header">
						<h3>Prometheus</h3>
						<img src="/imgs/prometheus_logo.webp" alt="Prometheus logo" class="service-logo">
					</div>
					<p class="service-description">Time series database for metrics collection and alerting.</p>
					<button id="prometheusBtn">Go to Prometheus</button>
				</div>
				<div class="service redHover">
					<div class="service-header">
						<h3>Grafana</h3>
						<img src="/imgs/grafana_logo.webp" alt="Grafana logo" class="service-logo">
					</div>
					<p class="service-description">Metrics visualization and monitoring dashboard platform.</p>
					<button id="grafanaBtn">Go to Grafana</button>
				</div>
			</div>
        `;
    }

    addEventListeners() {
        const indexAdminBtn = this.container.querySelector("#indexAdminBtn");
		const settingsBtn = this.container.querySelector("#settingsBtn");
        const logoutBtn = this.container.querySelector("#logoutBtn");
		const elasticsearchBtn = this.container.querySelector("#elasticsearchBtn");
		const kibanaBtn = this.container.querySelector("#kibanaBtn");
		const nodeExporterBtn = this.container.querySelector("#nodeExporterBtn");
		const cadvisorBtn = this.container.querySelector("#cadvisorBtn");
		const prometheusBtn = this.container.querySelector("#prometheusBtn");
		const grafanaBtn = this.container.querySelector("#grafanaBtn");

        logoutBtn.addEventListener("click", () => {
            window.app.chatBox.disconnect();
            window.app.logout();
        });

		settingsBtn.addEventListener('click', () => {
            window.app.router.navigateTo('/settings');
        });

		indexAdminBtn.addEventListener('click', () => {
            window.app.router.navigateTo('/index');
        });

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
