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

			<div id="mainPage">
				<h1>Admin</h1>
				<h1>Admin</h1>
				<h1>Admin</h1>
				<h1>Admin</h1>
				<h1>Admin</h1>
				<h1>Admin</h1>
				<h1>Admin</h1>
				<h1>Admin</h1>
				<h1>Admin</h1>
				<h1>Admin</h1>
				<h1>Admin</h1>
				<h1>Admin</h1>
				<h1>Admin</h1>
				<h1>Admin</h1>
				<h1>Admin</h1>
				<h1>Admin</h1>
        `;
    }

    addEventListeners() {
        const indexAdminBtn = this.container.querySelector("#indexAdminBtn");
		const settingsBtn = this.container.querySelector("#settingsBtn");
        const logoutBtn = this.container.querySelector("#logoutBtn");

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
	}
}
