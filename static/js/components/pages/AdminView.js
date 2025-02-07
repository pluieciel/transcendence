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
