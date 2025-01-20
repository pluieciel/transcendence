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
                                    id="usrnm-form" 
                                    placeholder="Enter username"
                                    class="form-control"
                                >
                            </div>
                            <div class="mb-3">
                                <input 
                                    type="password" 
                                    id="pwd-form" 
                                    placeholder="Enter password"
                                    class="form-control"
                                >
                            </div>
                            <div class="mb-3">
                                <input 
                                    type="password" 
                                    id="cfm-pwd-form" 
                                    placeholder="Confirm password"
                                    class="form-control"
                                >
                            </div>

                            <div class="mb-3">
                                Avatar:
                                <input 
                                    type="file" 
                                    id="avatar" 
                                    accept="image/*"
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
		const redirectUri = encodeURIComponent('https://10.11.2.6:9000/signup/oauth');
		const scope = 'public';
		const state = 'this_is_a_very_long_random_string_i_am_unguessable';
		const authorizeUrl = `https://api.intra.42.fr/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`;
        const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
        
		form42.addEventListener("click", () => {
			window.location.href = authorizeUrl;
        });
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = this.container.querySelector('#usrnm-form').value;
            const password = this.container.querySelector('#pwd-form').value;
            const confirmPassword = this.container.querySelector('#cfm-pwd-form').value;
            const errorDiv = this.container.querySelector('#passwordError');

			if (!password || !confirmPassword || !username)
				return this.error('Please fill all fields');
			else if (username.slice(-2) === "42")
				return this.error('Dont put 42 at the end of your username!!');
			else if (username === "admin")
				return this.error('You are not admin!!');
			else if (password !== confirmPassword)
				return this.error('Passwords do not match');

            
            const formData = new FormData();
            const originalFile = this.container.querySelector('#avatar').files[0];
            const hashedPassword = CryptoJS.SHA256(password).toString();
            formData.append('username', username);
            formData.append('password', hashedPassword);
            if (originalFile) {
                if (originalFile.size > MAX_FILE_SIZE) {
                    errorDiv.textContent = 'File size exceeds the 2MB limit';
                    errorDiv.classList.remove('d-none');
                    return;
                }
                // Get file extension
                const extension = originalFile.name.split('.').pop();
                // Create new filename with timestamp
                const newFilename = `${username}.${extension}`;
                // Create new File object with custom name
                const modifiedFile = new File([originalFile], newFilename, {
                    type: originalFile.type,
                    lastModified: originalFile.lastModified
                });
                formData.append('avatar', modifiedFile);
            }
            

            try {
                const response = await fetch('/api/signup/', {
                    method: 'POST',
                    body: formData
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