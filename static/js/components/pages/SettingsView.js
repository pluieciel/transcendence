export default class MainView {
    constructor(container) {
        this.token = window.app.getToken();
		this.container = container;
        const decodedPayload = jwt_decode(window.app.getToken());
        this.username = decodedPayload.username;
        this.render();
        this.addEventListeners();
    }

    render() {
        this.container.innerHTML = `
        	<div class="container">
			    <header>
			        <h1>PONG</h1>
						<button id="indexBtn">Main page</button>
						<button id="logoutBtn">Log out</button>
				</header>
				<h1>t</h1>
				<h1>t</h1>
				<button type="button" class="btn btn-primary" id="enable2FA">Enable 2FA</button>
				<div class="modal fade" id="totpModal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h1 class="modal-title fs-5" id="staticBackdropLabel">Two-Factor Authentication</h1>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <form id="totpForm">
	                        <div class="modal-body">
	                                <div id="qrCode">
	                                </div>
	                                <div class="mb-3">
	                                    <input id="totpInput" class="form-control" maxlength="6" required>
	                                </div>
	                                <div id="totpError" class="alert alert-danger d-none"></div>
	                        </div>
	                        <div class="modal-footer">
	                            <button type="submit" class="btn btn-primary" id="totpSubmit">Submit</button>
	                        </div>
                        </form>
                    </div>
                </div>
            </div>
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
        const enable2FA = this.container.querySelector('#enable2FA');
        enable2FA.addEventListener('click', async (e) => {
            e.preventDefault();
	        try {
	            const response = await fetch('/api/settings/2fa/generate', {
	                method: 'POST',
	                headers: {
	                    'Content-Type': 'application/json',
	                    'Authorization': `${this.token}`,
	                },
	            });

	            const data = await response.json();

	            if (data.success) {
					new bootstrap.Modal(this.container.querySelector('#totpModal')).show();
					const qrCode = this.container.querySelector('#qrCode');
					qrCode.innerHTML = data.qr_code;
	            } else {

	            }
	        } catch (error) {

	        }
	    });
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