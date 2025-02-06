export default class MainView {
    constructor(container) {
        this.container = container;
		this.init();
    }

	async init() {
		this.render();
		this.addEventListeners();
		await this.getSettings();
	}
	
	async getSettings() {
		if (!window.app.settings['fetched'])
			await window.app.getPreferences();
		if (window.app.settings.is_admin) {
			const adminButton = document.getElementById("admin-button");
			adminButton.style.display = "block";
		}
	}
    render() {
        this.container.innerHTML = `
			<header>
				<h1 id="pong">P 
					<button id="credit-button">
						<i class="fa-solid fa-table-tennis-paddle-ball fa-xs"></i>
					</button>
					 N G
				</h1>
				<div id="nav-buttons">
					<button class="nav-button" id="play-button">
						<i class="fa-solid fa-gamepad fa-xl"></i>Play
					</button>
					<button class="nav-button" id="customize-button">
						<i class="fa-solid fa-palette fa-xl"></i>Customize
					</button>
					<button class="nav-button" id="leaderboard-button">
						<i class="fa-solid fa-medal fa-xl"></i>Leaderboard
					</button>
					<button class="nav-button" id="achievements-button">
						<i class="fa-solid fa-trophy fa-xl"></i>Achievements
					</button>
					<button class="nav-button" id="profile-button">
						<i class="fa-solid fa-user fa-xl"></i>Profile
					</button>
					<button class="nav-button nav-button-disabled" id="admin-button">
						<i class="fa-solid fa-user-tie fa-xl"></i>Admin
					</button>
					<button class="nav-button" id="logout-button">
						<i class="fa-solid fa-right-from-bracket fa-xl"></i>Log Out
					</button>
				</div>
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

	addNavEventListeners() {
		const creditButton = document.getElementById("credit-button");
		const playButton = document.getElementById("play-button");
		const customizeButton = document.getElementById("customize-button");
		const leaderboardButton = document.getElementById("leaderboard-button");
		const achievementsButton = document.getElementById("achievements-button");
		const profileButton = document.getElementById("profile-button");
		const adminButton = document.getElementById("admin-button");
		const logoutButton = document.getElementById("logout-button");

		creditButton.addEventListener("click", () => {
			window.app.router.navigateTo("/credits");
		});

		playButton.addEventListener("click", () => {
			window.app.router.navigateTo("/index");
		});

		customizeButton.addEventListener("click", () => {
			window.app.router.navigateTo("/customize");
		});
		
		leaderboardButton.addEventListener("click", () => {
			window.app.router.navigateTo("/leaderboard");
		});

		achievementsButton.addEventListener("click", () => {
			window.app.router.navigateTo("/achievements");
		});

		profileButton.addEventListener("click", () => {
			window.app.router.navigateTo("/profile");
		});

		adminButton.addEventListener("click", () => {
			window.app.router.navigateTo("/admin");
		});

		logoutButton.addEventListener("click", () => {
			window.app.chatBox.disconnect();
			window.app.logout();
		});
	}

    addEventListeners() {
		this.addNavEventListeners();
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
