export default class Login {
    constructor(container) {
        this.container = container;
        this.render();
        this.addEventListeners();
    }

    render() {
        this.container.innerHTML = `
            <div class="container">
                <div class="row justify-content-center">
                    <div class="col-md-4">
                        <form id="loginForm" class="card p-4 shadow">
                            <div class="mb-3">
                                <input type="text" id="username" placeholder="Enter username" class="form-control">
                            </div>
                            <div class="mb-3">
                                <input type="password" id="password" placeholder="Enter password" class="form-control">
                            </div>
                            <div id="loginError" class="alert alert-danger d-none"></div>
                            <button type="submit" class="btn btn-primary w-100">Log In</button>
                            <button type="button" class="btn btn-primary w-100 LogIn42 OAuth">Login In with 42</button>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    addEventListeners() {
        const form = this.container.querySelector('#loginForm');
		const form42 = this.container.querySelector('.LogIn42');
		const clientId = 'u-s4t2ud-ba5b0c72367af9ad1efbf4d20585f3c315b613ece176ca16919733a7dba999d5';
		const redirectUri = encodeURIComponent('http://10.11.2.1:9000/signup/oauth');
		const scope = 'public';
		const state = 'this_is_a_very_long_random_string_i_am_unguessable';
		const authorizeUrl = `https://api.intra.42.fr/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`;

		form42.addEventListener("click", () => {
			window.location.href = authorizeUrl;
        });
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = this.container.querySelector('#username').value;
            const password = this.container.querySelector('#password').value;
            const errorDiv = this.container.querySelector('#loginError');
            const hashedPassword = CryptoJS.SHA256(password).toString();
            
			if (!username || !password)
				errorDiv.textContent = 'Must fill username and password field';
				
            try {
                const response = await fetch('/api/login/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: username,
                        password: hashedPassword
                    })
                });
            
                const data = await response.json();
            
                if (data.success) {
                    window.app.login(username);
                } else {
                    errorDiv.textContent = data.message || 'Login failed';
                    errorDiv.classList.remove('d-none');
                }
            } catch (error) {
                errorDiv.textContent = 'An error occurred';
                errorDiv.classList.remove('d-none');
            }
        });
    }
}