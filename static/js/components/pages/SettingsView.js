export default class MainView {
    constructor(container, appState) {
		this.container = container;
        this.username = appState.username;
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
	<div class="welcome">
        <p>Welcome to your settings, you can change everything here!</p>
    </div>
	<div class ="content">
		<div class="containerBtn">
			<h3>Be careful with those</h3>
			<button id="deleteAccBtn">Delete my account</button>
		</div>
	</div>
        `;
    }

    addEventListeners() {
        // Logout button
        const logoutBtn = this.container.querySelector('#logoutBtn');
		const indexBtn = this.container.querySelector('#indexBtn');
		const wipeBtn = this.container.querySelector('#deleteAccBtn');

		wipeBtn.addEventListener('click', () => {
			this.eraseInDB()
            window.app.logout();
        });
		logoutBtn.addEventListener('click', () => {
            window.app.logout();
        });
        indexBtn.addEventListener('click', () => {
            window.app.router.navigateTo('/index');
        });
    }

	async eraseInDB() {
		try {
			const response = await fetch('/api/del/user', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
                    'Authorization': `${window.app.state.token}`
				},
				body: JSON.stringify({
					username: this.username,
				})
			});

			if (!response.ok) {
				console.error(`Error: ${response.status} - ${response.statusText}`);
				return;
			}
	
			// Check if there is any content in the response
			const responseText = await response.text(); // Read response as text first
			if (!responseText) {
				console.error('Empty response body');
				return;
			}
	
			// Now parse the text into JSON
			const data = JSON.parse(responseText);
			console.log(data);

			if (data.success) {
				alert("deleted user successfully");
				console.log("deleted user successfully");
			} else {
				console.log("smth is wrong");
			}
		} catch (error) {
			console.error('An error occurred: ', error);
		}
	}
}