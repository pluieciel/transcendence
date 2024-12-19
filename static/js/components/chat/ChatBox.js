export default class ChatBox {
    constructor(container, username) {
        this.container = container;
        this.username = username;
        this.chatSocket = null;
        this.publicMessages = [];
        this.privateMessages = {};
        this.newMessage = '';
        this.activeTab = 'public';
        this.users = [];
        this.blocked = [];
        this.onlineusers = [];
        this.waiting_users = [];
        this.waiting = true;
        
        this.render();
        this.initWebSocket();
        this.addEventListeners();
    }

    render() {
        this.container.innerHTML = `
            <!-- Chat button -->
            <button class="btn btn-primary position-fixed end-0 bottom-0 m-3"
                    type="button" 
                    data-bs-toggle="offcanvas" 
                    data-bs-target="#offcanvas">
                <i class="fas fa-comment"></i>
            </button>
            
            <!-- Chat box -->
            <div class="offcanvas offcanvas-end custom-offcanvas"
                    data-bs-scroll="true" 
                    tabindex="-1" 
                    id="offcanvas">
                <div class="card-header text-bg-dark d-flex justify-content-between align-items-center p-2" 
                    data-bs-theme="dark">
                    <button type="button" 
                            class="btn-close position-absolute start-0 ms-2" 
							id="btn-closing-chat"
                            data-bs-dismiss="offcanvas" 
                            aria-label="Close">
                    </button>
                    <div class="w-100 d-flex align-items-center flex-grow-1 justify-content-center">
                        <i class="fas fa-comment"></i>
                        <p class="mb-0 ms-2 fw-bold">Chat Box</p>
                    </div>
                </div>

                <!-- Flex container -->
                <div class="chatnavbox d-flex flex-column h-100">
                    <div class="d-flex h-100">
                        <!-- Tabs -->
                        <ul class="nav flex-column nav-tabs custom-tabs" id="chatTabs">
                            <li class="nav-item">
                                <a class="chat-nav-link active" data-tab="online" title="Online Users">
                                    <i class="fas fa-user"></i>
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="chat-nav-link" data-tab="public" title="Public Chatroom">
                                    <i class="fas fa-users"></i>
                                </a>
                            </li>
                            <div id="userTabs"></div>
                        </ul>
                        
                        <!-- Chat content -->
                        <div class="card-body chat-messages overflow-auto" id="messageContainer">
                            <div id="onlineUsers" class="chat-messagebox online-users-list"></div>
                            <div id="publicChat" class="chat-messagebox d-none"></div>
                            <div id="privateChats"></div>
                        </div>
                    </div>

                    <!-- Input -->
                    <div class="card-footer">
                        <div class="input-group">
                            <input type="text" 
                                    class="form-control"
                                    id="messageInput"
                                    placeholder="${this.username}: Type a message...">
                            <button class="btn btn-primary" id="sendButton">
                                <i class="fas fa-paper-plane"></i><span class="fw-bold"> Send</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Initialize Bootstrap offcanvas
        new bootstrap.Offcanvas(document.getElementById('offcanvas'));
    }

    initWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        const wsUrl = `${protocol}${window.location.host}/ws/chat/?username=${this.username}`;
        
        this.chatSocket = new WebSocket(wsUrl);
        
        this.chatSocket.onopen = () => {
            console.log("WebSocket connection established");
        };
        
        this.chatSocket.onclose = () => {
            console.log("WebSocket connection closed");
        };
        
        this.chatSocket.onmessage = (e) => {
            const data = JSON.parse(e.data);
            //console.log(data);
            if (data.message_type === "system" && data.recipient === 'update_online_users') {
                const dict = JSON.parse(data.message)
                //console.log(data);
                this.onlineusers = dict.online_users.filter(user => user !== this.username).sort((a, b) => a.localeCompare(b));
                this.onlineusers.unshift(this.username);
                this.waiting_users = dict.waiting_users;
                this.updateOnlineUsersList();
            } else if (data.message_type === "system" && data.recipient === 'update_waiting_users') {
                this.waiting_users = JSON.parse(data.message);
                this.updateOnlineUsersList();
            } else if (data.message_type === "chat" && data.recipient === 'public') {
                if (!this.blocked.includes(data.sender)) {
					data.message = this.escapeHtml(data.message);
                    this.publicMessages.push(data);
                    this.updatePublicChat();
                }
            } else if (data.message_type === "system_accept") {
                console.log(data);
            } else {
                this.handlePrivateMessage(data);
            }
            //console.log(this.privateMessages);
            this.scrollToBottom();
        };
    }

    updateOnlineUsersList() {
        const container = this.container.querySelector('#onlineUsers');
        container.innerHTML = this.onlineusers.map(user => `
            <div class="user-item d-flex align-items-center p-2 justify-content-between">
                <span class="d-flex align-items-center">
                    <span class="online-indicator me-2"></span>
                    <span class="user-name">${user}</span>
                </span>
                ${user !== this.username ? `
                    <span class="d-flex align-items-center">
                        ${this.waiting_users.includes(user) ? `
                            <button class="btn btn-primary square-btn me-1" data-action="invite" data-user="${user}">
                                <i class="fa-solid fa-gamepad"></i>
                            </button>
                        ` : ''}
                        <button class="btn btn-primary square-btn me-1" data-action="profile" data-user="${user}">
                            <i class="fas fa-user"></i>
                        </button>
                        <button class="btn btn-primary square-btn me-1" data-action="chat" data-user="${user}">
                            <i class="fas fa-comments"></i>
                        </button>
                        <button class="btn btn-primary square-btn ${this.blocked.includes(user) ? 'square-btn-red' : ''}" 
                                data-action="block" 
                                data-user="${user}">
                            <i class="fas fa-ban"></i>
                        </button>
                    </span>
                ` : `
                    <span class="d-flex align-items-center">
                        <button class="btn btn-primary square-btn me-1 ${this.waiting? '' : 'square-btn-red'}"
                        data-action="waiting">
                            <i class="fa-solid fa-gamepad"></i>
                        </button>
                    </span>
                `}
            </div>
        `).join('');
    }

    updatePublicChat() {
        const container = this.container.querySelector('#publicChat');
        container.innerHTML = this.publicMessages.map(msg => this.createMessageHTML(msg)).join('');
    }

    handlePrivateMessage(data) {
        data.message = this.escapeHtml(data.message);
        if (!this.privateMessages[data.sender]) {
			this.privateMessages[data.sender] = [];
        }
        if (!this.privateMessages[data.recipient]) {
			this.privateMessages[data.recipient] = [];
        }
        if (!this.blocked.includes(data.sender)) {
            this.privateMessages[data.sender].push(data);
            this.addUserTab(data.sender);
            this.updatePrivateChat(data.sender);
        }
        if (!this.blocked.includes(data.recipient) || data.sender === this.username) {
			this.privateMessages[data.recipient].push(data);
            this.addUserTab(data.recipient);
            this.updatePrivateChat(data.recipient);
        }
    }
	
    createMessageHTML(msg) {
        return `
            <div class="chat-message ${msg.sender === this.username ? 'right' : msg.message_type === 'chat' ? 'left' : 'admin'}">
                <div class="message-content ${msg.message_type !== 'chat' ? msg.message_type === 'system' ? 'admin-message' : 'invite-message' : ''}">
                    <div class="message-header">
                        <span class="message-username">${this.capitalizeFirstLetter(msg.sender)}</span>
                        <span class="message-timestamp">${msg.time}</span>
                    </div>
					<span class="message-text" id="invite-message">${msg.message_type === 'system_invite' ? 
                        '<strong>' + msg.sender + '</strong> ' + msg.message +
                        `<button class="btn btn-primary square-btn me-1" data-action="accept" data-user="${msg.sender}">
                                <i class="fa-solid fa-check"></i>
                            </button>`
                        : msg.message}</span>
                </div>
            </div>
        `;
    }

    addUserTab(user) {
        if (!this.users.includes(user) && user !== this.username && user !== "admin" && user !== "public") {
            this.users.push(user);
            this.updateUserTabs();
        }
    }

    updateUserTabs() {
        const container = this.container.querySelector('#userTabs');
        container.innerHTML = this.users.map(user => `
            <li class="nav-item">
                <a class="chat-nav-link" 
                   data-tab="user-${user}" 
                   title="${user}"
                   data-user="${user}">
                    ${user.charAt(0).toUpperCase()}
                </a>
            </li>
        `).join('');
    }

    updatePrivateChat(user) {
        const container = this.container.querySelector('#privateChats');
        let chatContainer = container.querySelector(`#chat-${user}`);
        
        if (!chatContainer) {
            chatContainer = document.createElement('div');
            chatContainer.id = `chat-${user}`;
            chatContainer.classList.add('chat-messagebox', 'd-none');
            container.appendChild(chatContainer);
        }
    
        chatContainer.innerHTML = this.privateMessages[user]
            .map(msg => this.createMessageHTML(msg))
            .join('');
    
        // Remove 'd-none' if this tab is active
        if (this.activeTab === `user-${user}`) {
            chatContainer.classList.remove('d-none');
        }
    }

    addEventListeners() {
        // Send message
        const sendButton = this.container.querySelector('#sendButton');
        const messageInput = this.container.querySelector('#messageInput');

        const sendMessage = () => {
            const message = messageInput.value.trim();
            if (!message) return;

            const messageData = {
                message: message,
                message_type: "chat",
                sender: this.username,
                recipient: this.activeTab === 'public' ? 'public' : this.activeTab.replace('user-', ''),
                time: new Date().toLocaleTimeString()
            };

            this.chatSocket.send(JSON.stringify(messageData));
            messageInput.value = '';
        };

        sendButton.addEventListener('click', sendMessage);
        messageInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') sendMessage();
        });

        // Tab switching
        const tabsContainer = this.container.querySelector('#chatTabs');
        tabsContainer.addEventListener('click', (e) => {
            const tabLink = e.target.closest('.chat-nav-link');
            //console.log(tabLink);
            if (!tabLink) return;

            // Update active tab
            this.container.querySelectorAll('.chat-nav-link').forEach(link => link.classList.remove('active'));
            tabLink.classList.add('active');

            // Show/hide content
            const tab = tabLink.dataset.tab;
            this.activeTab = tab;
            
            this.container.querySelector('#onlineUsers').classList.add('d-none');
            this.container.querySelector('#publicChat').classList.add('d-none');
            this.container.querySelectorAll('[id^="chat-"]').forEach(el => {if (el) el.classList.add('d-none')});

            if (tab === 'online') {
                this.container.querySelector('#onlineUsers').classList.remove('d-none');
            } else if (tab === 'public') {
                this.container.querySelector('#publicChat').classList.remove('d-none');
            } else {
                const user = tabLink.dataset.user;
                const userChat = this.container.querySelector(`#chat-${user}`);
                if (userChat) userChat.classList.remove('d-none');
            }
        });

        // User actions (chat/block)
        const onlineUsers = this.container.querySelector('#onlineUsers');
        onlineUsers.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;

            const action = button.dataset.action;
            const user = button.dataset.user;

            if (action === 'chat') {
                this.addUserTab(user);
                // Switch to user's chat tab
                const userTab = this.container.querySelector(`[data-tab="user-${user}"]`);
                if (userTab) userTab.click();
            } else if (action === 'block') {
                this.toggleBlockUser(user);
            } else if (action === 'waiting') {
                this.waiting = !this.waiting;
                this.updateOnlineUsersList();
                const messageData = {
                    message: "update_waiting_status",
                    sender: this.username,
                    recipient: "admin",
                    message_type: "system",
                    wait_status: this.waiting,
                    time: new Date().toLocaleTimeString()
                };
                this.chatSocket.send(JSON.stringify(messageData));
            } else if (action === 'invite') {
                const messageData = {
                    message: "invite_user",
                    sender: this.username,
                    recipient: user,
                    message_type: "system",
                    time: new Date().toLocaleTimeString()
                };
                this.chatSocket.send(JSON.stringify(messageData));
            } else if (action === 'profile') {
                window.app.router.navigateTo(`/profile/${user}`);
            }
        });

        // Right-click to remove user tab
        tabsContainer.addEventListener('contextmenu', (e) => {
            const tabLink = e.target.closest('.chat-nav-link');
            if (!tabLink || !tabLink.dataset.user) return;

            e.preventDefault();
            const user = tabLink.dataset.user;
            this.users = this.users.filter(u => u !== user);
            this.updateUserTabs();
            
            // Switch to public chat if removed tab was active
            if (this.activeTab === `user-${user}`) {
                this.container.querySelector('[data-tab="public"]').click();
            }
        });

        // accept invite
        const invitemsg = this.container.querySelector('#privateChats');
        invitemsg.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;

            const action = button.dataset.action;
            const user = button.dataset.user;

            if (action === 'accept') {
                //console.log("accept invite");
                const messageData = {
                    message: "accept_invite",
                    sender: this.username,
                    recipient: user,
                    message_type: "system_accept",
                    time: new Date().toLocaleTimeString()
                };
                this.chatSocket.send(JSON.stringify(messageData));
            }
        });
    }

    toggleBlockUser(user) {
        if (this.blocked.includes(user)) {
            this.blocked = this.blocked.filter(u => u !== user);
        } else {
            this.blocked.push(user);
        }
        this.updateOnlineUsersList();
    }

    capitalizeFirstLetter(string) {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    scrollToBottom() {
		const container = this.container.querySelector('#messageContainer');
        container.scrollTop = container.scrollHeight;
    }
	
	escapeHtml(str) {
		return str.replace(/[&<>"']/g, function (match) {
			switch (match) {
				case '&': return '&amp;';
				case '<': return '&lt;';
				case '>': return '&gt;';
				case '"': return '&quot;';
				case "'": return '&apos;';
			}
		});
	}
}