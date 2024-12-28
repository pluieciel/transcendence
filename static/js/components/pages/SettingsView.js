export default class MainView {
	
	#isAllowed;

    constructor(container, appState) {
		this.container = container;
        this.username = appState.username;
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
        `;
    }

    addEventListeners() {
        const logoutBtn = document.getElementById('logoutBtn');
        const changeThemeBtn = document.getElementById('changeThemeBtn');
		const indexBtn = document.getElementById('indexBtn');
		const wipeBtn = document.getElementById('deleteAccBtn');
		const button = document.getElementById('passwordButton');
        const input = document.getElementById('passwordInput');
		
        button.addEventListener('click', () => {
			button.style.display = 'none';
            input.style.display = 'inline-block';
            input.focus();
        });
		
		let isSwitching = false;
		changeThemeBtn.addEventListener('click', async () => {
			if (isSwitching) return;
			isSwitching = true;
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
						username: this.username,
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
			} finally {
				isSwitching = false;
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
							username: this.username,
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
					username: this.username,
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
}