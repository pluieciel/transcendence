import Login from "./login/Login.js";
import SignUp from "./login/SignUp.js";

export default class LoginView {
	constructor(container) {
		this.container = container;
		this.render();
		this.addEventListeners();
		this.showLogin();
		//this.createDefaultUsers();
	}

	render() {
		this.container.innerHTML = `
            <div>
                <nav class="nav-container">
                    <div class="nav-links d-flex justify-content-center">
                        <a href="#" id="signup-link" class="nav-link" data-view="signup">Sign Up </a>|
                        <a href="#" id="login-link" class="nav-link" data-view="login"> Login</a>
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

	async createDefaultUsers() {
		const hashedPassword = CryptoJS.SHA256("1").toString();
		const hashedPassword2 = CryptoJS.SHA256("2").toString();
		const hashedPassword3 = CryptoJS.SHA256("a").toString();
		const response1 = await fetch("/api/signup/", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				username: "1",
				password: hashedPassword,
			}),
		});
		const response2 = await fetch("/api/signup/", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				username: "2",
				password: hashedPassword2,
			}),
		});
		const response3 = await fetch("/api/signup/", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				username: "a",
				password: hashedPassword3,
			}),
		});
	}
}
