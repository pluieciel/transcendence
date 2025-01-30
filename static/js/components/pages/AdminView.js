export default class MainView {
    constructor(container) {
        this.container = container;
		this.render();
		this.addEventListeners();
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
			<div class ="containerAdmin">
				<div class="itemService redHover">
					<h3>Elasticsearch</h3>
					<button id="elasticsearchBtn">Go to Elasticsearch</button>
				</div>
				<div class="itemService redHover">
					<h3>Kibana</h3>
					<button id="kibanaBtn">Go to Kibana</button>
				</div>
				<div class="itemService redHover">
					<h3>Node Exporter</h3>
					<button id="nodeExporterBtn">Go to Node Exporter</button>
				</div>
				<div class="itemService redHover">
					<h3>cAdvisor</h3>
					<button id="cadvisorBtn">Go to cAdvisor</button>
				</div>
				<div class="itemService redHover">
					<h3>Prometheus</h3>
					<button id="prometheusBtn">Go to Prometheus</button>
				</div>
				<div class="itemService redHover">
					<h3>Grafana</h3>
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
		const cAdvisorBtn = this.container.querySelector("#cadvisorBtn");
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

		elasticsearchBtn.addEventListener('click', () => {
            window.location.href = '/admin/services/elasticsearch';
        });

		kibanaBtn.addEventListener('click', () => {
            window.location.href = '/admin/services/kibana';
        });

		nodeExporterBtn.addEventListener('click', () => {
            window.location.href = '/admin/services/node-exporter';
        });

		cAdvisorBtn.addEventListener('click', () => {
            window.location.href = '/admin/services/cadvisor';
        });

		prometheusBtn.addEventListener('click', () => {
            window.location.href = '/admin/services/prometheus';
        });

		grafanaBtn.addEventListener('click', () => {
            window.location.href = '/admin/services/grafana';
        });
	}
}
