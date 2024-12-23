export default class MainView {
    constructor(container) {
		this.container = container;
        const decodedPayload = jwt_decode(window.app.getToken());
        this.username = decodedPayload.username;
        this.render();
        this.addEventListeners();
    }

    render() {
        this.container.innerHTML = `
    <header>
        <h1>PONG</h1>
			<button id="indexBtn">Main page</button>
			<button id="logoutBtn">Log out</button>
	</header>

	<div class ="content">
	</div>
        `;
    }

    showLeaderboard() {
        const mainContent = this.container.querySelector('#mainContent');
        mainContent.innerHTML = '<h2>Leaderboard View</h2>';
        // Add any additional logic to initialize the leaderboard view
    }

    addEventListeners() {
        // Logout button
        const logoutBtn = this.container.querySelector('#logoutBtn');
		const indexBtn = this.container.querySelector('#indexBtn');
        logoutBtn.addEventListener('click', () => {
            window.app.logout();
        });
        indexBtn.addEventListener('click', () => {
            window.app.router.navigateTo('/index');
        });

        // Navigation links
        const navLinks = this.container.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = e.target.dataset.view;
                if (view === 'game') {
                    this.showGame();
                } else if (view === 'leaderboard') {
                    this.showLeaderboard();
                }
            });
        });
    }
}