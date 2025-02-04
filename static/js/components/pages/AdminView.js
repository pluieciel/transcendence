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
					<button id="indexAdminBtn" class="nav-btn disabledBtn">Admin</button>
					<button id="indexBtn" class="nav-btn">Index</button>
					<button id="customBtn" class="nav-btn">Custom</button>
					<button id="profileBtn" class="nav-btn">Profile</button>
					<button id="creditsBtn" class="nav-btn">Credits</button>
					<button id="logoutBtn" class="nav-btn">Log out</button>
			</header>
			<div class="welcome">
				<p>Welcome to your admin dashboard, you can access all monitoring services here!</p>
			</div>
			<div id="services">
			<div id="services-container">
				<div class="service userOutline">
					<div class="service-header">
						<h3>Elasticsearch</h3>
						<img src="/imgs/elasticsearch_logo.webp" alt="Elasticsearch logo" class="service-logo">
					</div>
					<p class="service-description">Search and analytics engine for all application logs and metrics.</p>
					<button id="elasticsearchBtn">Go to Elasticsearch</button>
				</div>
				<div class="service userOutline">
					<div class="service-header">
						<h3>Kibana</h3>
						<img src="/imgs/kibana_logo.webp" alt="Kibana logo" class="service-logo">
					</div>
					<p class="service-description">Visualization dashboard for Elasticsearch data and log analysis.</p>
					<button id="kibanaBtn">Go to Kibana</button>
				</div>
				<div class="service userOutline">
					<div class="service-header">
						<h3>cAdvisor</h3>
						<img src="/imgs/cadvisor_logo.webp" alt="cAdvisor logo" class="service-logo">
					</div>
					<p class="service-description">Container resource usage and performance analyzer.</p>
					<button id="cadvisorBtn">Go to cAdvisor</button>
				</div>
				<div class="service userOutline">
					<div class="service-header">
						<h3>Node Exporter</h3>
					</div>
					<p class="service-description">Hardware and OS metrics exporter for system monitoring.</p>
					<button id="nodeExporterBtn">Go to Node Exporter</button>
				</div>
				<div class="service userOutline">
					<div class="service-header">
						<h3>Prometheus</h3>
						<img src="/imgs/prometheus_logo.webp" alt="Prometheus logo" class="service-logo">
					</div>
					<p class="service-description">Time series database for metrics collection and alerting.</p>
					<button id="prometheusBtn">Go to Prometheus</button>
				</div>
				<div class="service userOutline">
					<div class="service-header">
						<h3>Grafana</h3>
						<img src="/imgs/grafana_logo.webp" alt="Grafana logo" class="service-logo">
					</div>
					<p class="service-description">Metrics visualization and monitoring dashboard platform.</p>
					<button id="grafanaBtn">Go to Grafana</button>
				</div>
			</div>
			</div>
        `;
    }

    addEventListeners() {
        const indexBtn = document.getElementById("indexBtn");
		const customBtn = document.getElementById("customBtn");
        const profileBtn = document.getElementById("profileBtn");
        const creditsBtn = document.getElementById("creditsBtn");
        const logoutBtn = document.getElementById("logoutBtn");
		const elasticsearchBtn = document.getElementById("elasticsearchBtn");
		const kibanaBtn = document.getElementById("kibanaBtn");
		const nodeExporterBtn = document.getElementById("nodeExporterBtn");
		const cadvisorBtn = document.getElementById("cadvisorBtn");
		const prometheusBtn = document.getElementById("prometheusBtn");
		const grafanaBtn = document.getElementById("grafanaBtn");

        logoutBtn.addEventListener("click", () => {
            window.app.chatBox.disconnect();
            window.app.logout();
        });

		creditsBtn.addEventListener('click', () => {
            window.app.router.navigateTo('/credits');
        });

		profileBtn.addEventListener('click', () => {
            window.app.router.navigateTo('/profile');
        });

		customBtn.addEventListener('click', () => {
            window.app.router.navigateTo('/custom');
        });

		indexBtn.addEventListener('click', () => {
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
