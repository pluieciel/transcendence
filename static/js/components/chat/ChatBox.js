export default class ChatBox {
    constructor(container) {
        const decodedPayload = jwt_decode(window.app.getToken());
        //console.log(decodedPayload);
        this.container = container;
        this.username = decodedPayload.username;
        this.chatSocket = null;
        this.publicMessages = [];
        this.privateMessages = {};
        this.newMessage = '';
        this.activeTab = 'online';
        this.users = [];
        this.blocked = [];
        this.onlineusers = [];
        this.allusers = [];
        this.friends = [];
        this.waiting_users = [];
        this.waiting = true;
        this.focususer = undefined;
        this.showingOnlineUsers = 0;
        
        this.hasNewMessages = false;
        this.render();
        this.initWebSocket();
        this.addEventListeners();
        this.newMessageIndicator = this.container.querySelector('#newMessageIndicator');
        this.offcanvas = this.container.querySelector('#offcanvas');
    }

    render() {
        this.container.innerHTML = `
            <!-- Chat button -->
            <button class="btn btn-primary position-fixed end-0 bottom-0 m-3"
                    type="button" 
                    data-bs-toggle="offcanvas" 
                    data-bs-target="#offcanvas">
                <i class="fas fa-comment"></i>
                <span id="newMessageIndicator" class="new-message-dot" style="display: none;"></span>
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

            <!-- Modal for invitation -->
            <div class="modal fade" id="sendInvitation" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h1 class="modal-title fs-5" id="staticBackdropLabel">Send Invitation</h1>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            ...
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" data-bs-dismiss="modal" id="sendInvitationButton">Send</button>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
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
            if (data.message_type === "system" && data.message === 'all_user_list') {
                this.allusers = data.usernames.sort((a, b) => a.localeCompare(b));
                this.updateOnlineUsersList();
            } else if (data.type == "friend_list") {
                this.friends = data.usernames.sort((a, b) => a.localeCompare(b));
                this.updateOnlineUsersList();
            } else if (data.message_type === "system" && data.recipient === 'update_online_users') {
                const dict = JSON.parse(data.message)
                //console.log(data);
                this.onlineusers = dict.online_users.filter(user => user !== this.username).sort((a, b) => a.localeCompare(b));
                this.onlineusers.unshift(this.username);
                this.waiting_users = dict.waiting_users;
                this.updateOnlineUsersList();
            } else if (data.message_type === "system" && data.recipient === 'update_waiting_users') {
                this.waiting_users = JSON.parse(data.message);
                this.updateOnlineUsersList();
            } else if (data.recipient === 'public') {
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
        if (this.showingOnlineUsers === 0) {
            container.innerHTML = this.onlineusers.map(user => {
            return `
                <div class="user-item d-flex align-items-center p-2 justify-content-between">
                    <span class="d-flex align-items-center">
                        <span class="online-indicator me-2"></span>
                        <div id="avatar_${user}"></div>
                        <span class="user-name ms-2">${user}</span>
                    </span>
                    ${user !== this.username ? `
                        <span class="d-flex align-items-center">
                            ${this.waiting_users.includes(user) ? `
                                <button class="btn btn-primary square-btn me-1" data-action="invite" data-user="${user}"
                                    data-bs-toggle="modal" data-bs-target="#sendInvitation">
                                    <i class="fa-solid fa-gamepad"></i>
                                </button>
                            ` : ''}
                            
                            <div class="dropdown">
                                <button class="btn btn-primary square-btn me-1" data-action="profile" data-user="${user}"
                                    data-bs-toggle="dropdown" aria-expanded="false">
                                <i class="fas fa-user"></i>
                                </button>
                                <ul class="dropdown-menu">
                                    <li class="dropdown-item" id='elo_${user}'>Loading...</li>
                                    <li class="dropdown-item" id='wr_${user}'>Loading...</li>
                                    <li class="dropdown-item" id='tn_${user}'>Loading...</li>
                                </ul>
                            </div>
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
                            <button id="Donotdisturb" class="btn btn-primary square-btn me-1 ${this.waiting? '' : 'square-btn-red'}"
                                data-action="waiting"
                                data-bs-toggle="tooltip" data-bs-placement="left" data-bs-title="Do not disturb">
                                <i class="fa-solid fa-gamepad"></i>
                            </button>
                        </span>
                    `}
                </div>
            `}).join('');
            container.innerHTML = "<div class=\"text-white\">Online Users</div>" + container.innerHTML;

            this.onlineusers.map(async (user) => {
                const avatar_div = this.container.querySelector(`#avatar_${user}`);
                if (avatar_div) {
                    const response = await fetch(`/api/get/avatar/${user}`,{
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `${window.app.getToken()}`,
                        },
                    });
                    const data = await response.json();
                    if (data.avatar) {
                        avatar_div.innerHTML = `<img src="${data.avatar}" width="30" height="30"></img>`;
                    }
                }
                const elo_div = this.container.querySelector(`#elo_${user}`);
                const wr_div = this.container.querySelector(`#wr_${user}`);
                const tn_div = this.container.querySelector(`#tn_${user}`);
                if (elo_div) {
                    const response = await fetch(`/api/get/profile/${user}`,{
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `${window.app.getToken()}`,
                        },
                    });
                    const data = await response.json();
                    //console.log(data);
                    if (data.elo) {
                        elo_div.innerHTML = `Elo: ${data.elo}`;
                        wr_div.innerHTML = `Winrate: ${data.winrate}%`;
                        tn_div.innerHTML = `Tournaments won: ${data['tourn']}`;
                    }
                }
            });

            setTimeout(() => {
                const donotdisbutton = this.container.querySelector('#Donotdisturb');
                const tooltip = bootstrap.Tooltip.getInstance(donotdisbutton);
                if (tooltip) tooltip.dispose();
                new bootstrap.Tooltip(donotdisbutton); // Initialize the tooltip
            }, 50);

            const popoverTriggerList = this.container.querySelectorAll('[data-bs-toggle="popover"]');
            const popoverList = [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));
        } else if (this.showingOnlineUsers === 1){
            // show all user list
            container.innerHTML = this.allusers.map(user => {
                return `
                    <div class="user-item d-flex align-items-center p-2 justify-content-between">
                        <span class="d-flex align-items-center">
                            <span class="${this.onlineusers.includes(user)?'online-indicator':'offline-indicator'} me-2"></span>
                            <div id="avatar_${user}"></div>
                            <span class="user-name ms-2">${user}</span>
                        </span>
                        ${this.friends.includes(user) ? '':
                        `<span class="d-flex align-items-center">  
                            <button class="btn btn-primary square-btn me-1" data-action="addfriend" data-user="${user}">
                                <i class="fa-solid fa-plus"></i>
                            </button>
                        </span>`} 
                    </div>
                `}).join('');
            container.innerHTML = "<div class=\"text-white\">All Users</div>" + container.innerHTML;

            this.allusers.map(async (user) => {
                const avatar_div = this.container.querySelector(`#avatar_${user}`);
                if (avatar_div) {
                    const response = await fetch(`/api/get/avatar/${user}`,{
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `${window.app.getToken()}`,
                        },
                    });
                    const data = await response.json();
                    if (data.avatar) {
                        avatar_div.innerHTML = `<img src="${data.avatar}" width="30" height="30"></img>`;
                    }
                }
            });
        } else if (this.showingOnlineUsers === 2){
            // show friend list
            container.innerHTML = this.friends.map(user => {
                return `
                    <div class="user-item d-flex align-items-center p-2 justify-content-between">
                        <span class="d-flex align-items-center">
                            <span class="${this.onlineusers.includes(user)?'online-indicator':'offline-indicator'} me-2"></span>
                            <div id="avatar_${user}"></div>
                            <span class="user-name ms-2">${user}</span>
                        </span>

                        <span class="d-flex align-items-center">
                            ${this.waiting_users.includes(user) ? `
                                <button class="btn btn-primary square-btn me-1" data-action="invite" data-user="${user}"
                                    data-bs-toggle="modal" data-bs-target="#sendInvitation">
                                    <i class="fa-solid fa-gamepad"></i>
                                </button>
                            ` : ''}
                            <div class="dropdown">
                                <button class="btn btn-primary square-btn me-1" data-action="profile" data-user="${user}"
                                    data-bs-toggle="dropdown" aria-expanded="false">
                                <i class="fas fa-user"></i>
                                </button>
                                <ul class="dropdown-menu">
                                    <li class="dropdown-item" id='elof_${user}'>Loading...</li>
                                    <li class="dropdown-item" id='wrf_${user}'>Loading...</li>
                                    <li class="dropdown-item" id='tnf_${user}'>Loading...</li>
                                </ul>
                            </div>
                            ${this.waiting_users.includes(user) ? `
                            <button class="btn btn-primary square-btn me-1" data-action="chat" data-user="${user}">
                                <i class="fas fa-comments"></i>
                            </button>
                            ` : ''}
                            <button class="btn btn-primary square-btn me-1 square-btn-red" data-action="removefriend" data-user="${user}">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </span>
                        
                    </div>
                `}).join('');
            container.innerHTML = "<div class=\"text-white\">Friends</div>" + container.innerHTML;

            this.friends.map(async (user) => {
                const avatar_div = this.container.querySelector(`#avatar_${user}`);
                if (avatar_div) {
                    const response = await fetch(`/api/get/avatar/${user}`,{
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `${window.app.getToken()}`,
                        },
                    });
                    const data = await response.json();
                    if (data.avatar) {
                        avatar_div.innerHTML = `<img src="${data.avatar}" width="30" height="30"></img>`;
                    }
                }
                const elo_div = this.container.querySelector(`#elof_${user}`);
                //console.log(elo_div);
                const wr_div = this.container.querySelector(`#wrf_${user}`);
                const tn_div = this.container.querySelector(`#tnf_${user}`);
                if (elo_div) {
                    const response = await fetch(`/api/get/profile/${user}`,{
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `${window.app.getToken()}`,
                        },
                    });
                    const data = await response.json();
                    //console.log(data);
                    if (data.elo) {
                        elo_div.innerHTML = `Elo: ${data.elo}`;
                        wr_div.innerHTML = `Winrate: ${data.winrate}%`;
                        tn_div.innerHTML = `Tournaments won: ${data['tourn']}`;
                    }
                }
            });
        }
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
        if ((msg.message_type === 'chat' || msg.message_type === 'system_invite')
            && !this.offcanvas.classList.contains('show')) {
            this.hasNewMessages = true;
            this.updateNewMessageIndicator();
        }
        return `
            <div class="chat-message ${msg.sender === this.username ? 'right' : msg.message_type === 'chat' ? 'left' : 'admin'}">
                <div class="message-content ${msg.message_type !== 'chat' ? msg.message_type === 'system' ? 'admin-message' : 'invite-message' : ''}">
                    <div class="message-header">
                        <span class="message-username">${this.capitalizeFirstLetter(msg.sender)}</span>
                        <span class="message-timestamp">${msg.time}</span>
                    </div>
					<span class="message-text" id="invite-message">${msg.message_type === 'system_invite' ? 
                        '<strong>' + msg.sender + '</strong> ' + msg.message + " in mode: " + msg.game_mode +
                        `<button class="btn btn-primary square-btn me-1" data-action="accept" data-user="${msg.sender}" data-mode="${msg.game_mode}">
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
            
            this.container.querySelector('#onlineUsers').classList.add('d-none');
            this.container.querySelector('#publicChat').classList.add('d-none');
            this.container.querySelectorAll('[id^="chat-"]').forEach(el => {if (el) el.classList.add('d-none')});
            
            if (tab === 'online') {
                this.container.querySelector('#onlineUsers').classList.remove('d-none');
                if (this.activeTab === 'online') {
                    this.showingOnlineUsers = (this.showingOnlineUsers + 1) % 3;
                }
                this.updateOnlineUsersList();
            } else if (tab === 'public') {
                this.container.querySelector('#publicChat').classList.remove('d-none');
            } else {
                const user = tabLink.dataset.user;
                const userChat = this.container.querySelector(`#chat-${user}`);
                if (userChat) userChat.classList.remove('d-none');
            }
            this.activeTab = tab;
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
                const tooltip = bootstrap.Tooltip.getInstance(button);
                if (tooltip) tooltip.dispose();
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
                this.focususer = user;
                const modalBody = document.querySelector('#sendInvitation .modal-body');
                modalBody.innerHTML = `<p>Invite <strong>${user}</strong> to game, choose game mode:</p>
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="flexRadioDefault" id="flexRadioDefault1" value="Vanilla" checked>
                        <label class="form-check-label" for="flexRadioDefault1">
                            Vanilla
                        </label>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="flexRadioDefault" id="flexRadioDefault2" value="Rumble">
                        <label class="form-check-label" for="flexRadioDefault2">
                            Rumble
                        </label>
                </div>
            `;
            } else if (action === 'addfriend') {
                const messageData = {
                    message: "addfriend",
                    sender: this.username,
                    recipient: "admin",
                    message_type: "system",
                    friend: user,
                    time: new Date().toLocaleTimeString()
                };
                this.chatSocket.send(JSON.stringify(messageData));
                setTimeout(() => {
                    this.updateOnlineUsersList();
                }, 200);
            } else if (action === 'removefriend') {
                const messageData = {
                    message: "removefriend",
                    sender: this.username,
                    recipient: "admin",
                    message_type: "system",
                    friend: user,
                    time: new Date().toLocaleTimeString()
                };
                this.chatSocket.send(JSON.stringify(messageData));
                setTimeout(() => {
                    this.updateOnlineUsersList();
                }, 200);
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

        // send invite
        const sendbutton = this.container.querySelector('#sendInvitationButton');
        sendbutton.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;

            const radios = document.querySelectorAll('input[name="flexRadioDefault"]');
            let selectedValue;
            radios.forEach((radio) => {
                if (radio.checked)
                    selectedValue = radio.value; // Get the value of the checked radio
            });
            const messageData = {
                    message: "invite_user",
                    sender: this.username,
                    recipient: this.focususer,
                    message_type: "system",
                    game_mode: selectedValue,
                    time: new Date().toLocaleTimeString()
                };
                this.chatSocket.send(JSON.stringify(messageData));
        });

        // accept invite
        const invitemsg = this.container.querySelector('#privateChats');
        invitemsg.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;

            const action = button.dataset.action;
            const user = button.dataset.user;
            const mode = button.dataset.mode;

            if (action === 'accept') {
                //console.log("accept invite");
                const messageData = {
                    message: "accept_invite",
                    sender: this.username,
                    recipient: user,
                    game_mode: mode,
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

    disconnect() {
        this.chatSocket.close();
    }

    updateNewMessageIndicator() {
        if (this.hasNewMessages) {
            this.newMessageIndicator.style.display = 'inline-block'; // Show the red dot
        }
    }
    clearNewMessages() {
        this.hasNewMessages = false;
        this.newMessageIndicator.style.display = 'none'; // Hide the red dot
    }
}