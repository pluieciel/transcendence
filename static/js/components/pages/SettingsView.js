export default class MainView {
	
	#isAllowed;

	constructor(container, appState) {
		this.container = container;
		this.appState = appState;
		this.#isAllowed = false;
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
		<div class="containerPrivate">
			<h3>Profile info i guess</h3>
			<button id="changeUsernameBtn">Change your username</button>
			<input type="text" id="newUsername" placeholder="Enter new username">
			<button id="changePpBtn">Change your profile picture</button>
			<button id="changeThemeBtn">Switch theme</button>
		</div>
		<div class="containerSensitive">
			<h3>Be careful with those</h3>
        	<input type="password" id="passwordInput" placeholder="Enter password to access">
			<button id="passwordButton">Set New Password</button>
        	<input type="password" id="newPasswordInput" placeholder="Enter your new password">
			<button id="deleteAccBtn">Delete my account</button>
		</div>
	</div>
    <div id="passwordError" class="alert alert-danger d-none"></div>

        `;
    }

    addEventListeners() {
		const changeUsernameBtn = document.getElementById('changeUsernameBtn');
        const changeThemeBtn = document.getElementById('changeThemeBtn');
        const logoutBtn = document.getElementById('logoutBtn');
		const indexBtn = document.getElementById('indexBtn');
		const wipeBtn = document.getElementById('deleteAccBtn');
		const button = document.getElementById('passwordButton');
        const input = document.getElementById('passwordInput');

        button.addEventListener('click', () => {
			button.style.display = 'none';
            input.style.display = 'inline-block';
            input.focus();
        });
		
		newUsername.addEventListener('keydown', async (event) => {
			if (event.key === "Enter") {
				if (newUsername.value.slice(-2) === "42")
					return this.error('Dont put 42 at the end of your username!!');
				try {
					const response = await fetch('/api/change/username', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'Authorization': `${window.app.state.token}`
						},
						body: JSON.stringify({
							newUsername: newUsername.value,
							username: this.appState.username,
						})
					});
				
					const data = await response.json();
				
					if (data.success) {
						console.log("changing username success");
						this.appState.username = newUsername.value;
					} else {
						console.log("changing username failed");
					}
				} catch (error) {
					console.error(error);
				}
			}
		});

		changeUsernameBtn.addEventListener('click', async () => {
			const newUsername = document.getElementById('newUsername');
			changeUsernameBtn.style.display = 'none';
			newUsername.style.display = 'inline-block';
			newUsername.focus();
		});

		changeThemeBtn.addEventListener('click', async () => {
			try {
				console.log("calling the api");
				const response = await fetch('/api/change/theme', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `${window.app.state.token}`
					},
					body: JSON.stringify({
						currentTheme: window.app.state.theme,
						username: this.appState.username,
					})
				});
		
				const data = await response.json();
		
				if (data.success) {
					console.log("changing theme success");
					window.app.state.theme = data['theme'];
					window.app.applyTheme();
					console.log("theme = " + window.app.state.theme);
				} else {
					console.log("changing theme failed");
				}
			} catch (error) {
				console.error(error);
			}
		});
		

		input.addEventListener('keydown', async (event) => {
			if (event.key === "Enter") {
				const password = this.container.querySelector('#passwordInput').value;
				const hashedPassword = CryptoJS.SHA256(password).toString();
				try {
					const response = await fetch('/api/login/', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							username: this.appState.username,
							password: hashedPassword
						})
					});
				
					const data = await response.json();
				
					if (data.success) {
						wipeBtn.style.display = "inline-block";
						button.style.display = "inline-block";
						input.style.display = "none";
						this.isAllowed = true;
						sessionStorage.setItem('token', data['token']);
					} else {
						console.log("login failed");
					}
				} catch (error) {
					console.error(error);
				}
			}
		});


		wipeBtn.addEventListener('click', () => {
			if (!this.isAllowed)
				return ;
			if (this.eraseInDB())
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
					username: this.appState.username,
				})
			});
			
			if (!response.ok) {
				console.error(`Error: ${response.status} - ${response.statusText}`);
				return;
			}
			const responseText = await response.text();
			const data = JSON.parse(responseText);

			if (data.success) {
				alert("deleted user successfully");
			} else {
				console.error("smth is wrong");
			}
		} catch (error) {
			console.error('An error occurred: ', error);
		}
	}
	
	error(error) {
		const errorDiv = this.container.querySelector('#passwordError');

		errorDiv.textContent = 'error: ' + error;
		errorDiv.classList.remove('d-none');
		return;
	}
}