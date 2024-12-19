import ChatBox from '../chat/ChatBox.js';

export default class ProfileView {
    constructor(container, appState) {
		this.container = container;
        this.username = appState.username;
        this.render();
        this.addEventListeners();
		this.initComponents();
    }

    render() {
        this.container.innerHTML = `
    <header>
        <h1>PONG</h1>
			<button id="indexBtn">Main page</button>
			<button id="logoutBtn">Log out</button>
	</header>
	<div class="welcome">
        <p>Here we goooooooooooooo</p>
    </div>
	<div class ="content">
		<div id="chatBoxContainer"></div>
	</div>
        `;
    }

	initComponents() {
        const chatBoxContainer = this.container.querySelector('#chatBoxContainer');
        this.chatBox = new ChatBox(chatBoxContainer, this.username);
    }

    addEventListeners() {
        const logoutBtn = this.container.querySelector('#logoutBtn');
		const indexBtn = this.container.querySelector('#indexBtn');

		logoutBtn.addEventListener('click', () => {
            window.app.logout();
        });
        indexBtn.addEventListener('click', () => {
            window.app.router.navigateTo('/index');
        });
    }
}