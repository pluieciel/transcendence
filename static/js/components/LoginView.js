import Login from "./login/Login.js";
import SignUp from "./login/SignUp.js";

export default class LoginView {
	constructor(container) {
		this.container = container;
		this.render();
		this.addEventListeners();
		this.showLogin();
		[...Array(8)].map((_, i) => i + 1).forEach(i => this.createDefaultUsers(`${i}`));
	}

	render() {
		this.container.innerHTML = `
            <div>
                <nav class="nav-container">
                    <div class="nav-links d-flex justify-content-center">
                        <a href="#" class="nav-link" data-view="signup">Sign Up</a> |
                        <a href="#" class="nav-link" data-view="login">Login</a>
                    </div>
                </nav>
                <div id="authContent"></div>
            </div>
        `;
	}

	showLogin() {
		const authContent = this.container.querySelector("#authContent");
		new Login(authContent);
	}

	showSignup() {
		const authContent = this.container.querySelector("#authContent");
		new SignUp(authContent);
	}

	addEventListeners() {
		const navLinks = this.container.querySelectorAll(".nav-link");
		navLinks.forEach((link) => {
			link.addEventListener("click", (e) => {
				e.preventDefault();
				const view = e.target.dataset.view;
				if (view === "login") {
					this.showLogin();
				} else if (view === "signup") {
					this.showSignup();
				}
			});
		});
	}

	async createDefaultUsers(user) {
		const formData = new FormData();
		const hashedPassword = CryptoJS.SHA256(user).toString();
		formData.append('username', user);
		formData.append('password', hashedPassword);

		try {
			const response = await fetch('/api/signup/', {
				method: 'POST',
				body: formData
			});
		} catch (error) {
			console.error('Error creating default users:', error);
		}
	}
}