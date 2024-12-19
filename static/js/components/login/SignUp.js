export default class SignUp {
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
                        <form id="signupForm" class="card p-4 shadow">
                            <div class="mb-3">
                                <input 
                                    type="text" 
                                    id="username" 
                                    placeholder="Enter username"
                                    class="form-control"
                                >
                            </div>
                            <div class="mb-3">
                                <input 
                                    type="password" 
                                    id="password" 
                                    placeholder="Enter password"
                                    class="form-control"
                                >
                            </div>
                            <div class="mb-3">
                                <input 
                                    type="password" 
                                    id="confirmPassword" 
                                    placeholder="Confirm password"
                                    class="form-control"
                                >
                            </div>
                            <div id="passwordError" class="alert alert-danger d-none"></div>
                            <button type="submit" class="btn btn-primary w-100">Sign Up</button>
                            <button type="button" class="btn btn-primary w-100 SignUp42 OAuth">Sign Up with 42</button>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    addEventListeners() {
		const form = this.container.querySelector('#signupForm');
		const form42 = this.container.querySelector('.SignUp42');
		const clientId = 'u-s4t2ud-ba5b0c72367af9ad1efbf4d20585f3c315b613ece176ca16919733a7dba999d5';
		const redirectUri = encodeURIComponent('https://10.11.2.1:9000/signup/oauth');
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
            const confirmPassword = this.container.querySelector('#confirmPassword').value;
            const errorDiv = this.container.querySelector('#passwordError');

			if (!password || !confirmPassword || !username)
				return this.error('Please fill all fields');
			else if (username.slice(-2) === "42")
				return this.error('Dont put 42 at the end of your username!!');
			else if (username === "admin")
				return this.error('You are not admin!!');
			else if (password !== confirmPassword)
				return this.error('Passwords do not match');

            const hashedPassword = CryptoJS.SHA256(password).toString();

            try {
                const response = await fetch('/api/signup/', {
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
                    console.log(data.message);
                    window.app.router.navigateTo('/login');
                } else {
                    errorDiv.textContent = data.message || 'Signup failed';
                    errorDiv.classList.remove('d-none');
                }
            } catch (error) {
                errorDiv.textContent = 'An error occurred';
                errorDiv.classList.remove('d-none');
            }
        });
    }

	error(error) {
		errorDiv.textContent = 'error';
		errorDiv.classList.remove('d-none');
		return;
	}
}