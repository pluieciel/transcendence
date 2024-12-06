<template>
    <!-- import icon -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">

    <!-- Chat button -->
    <button class="btn btn-primary position-fixed end-0 bottom-0 m-3"
            style="z-index: 9999;"
            type="button" 
            data-bs-toggle="offcanvas" 
            data-bs-target="#offcanvas">
        <span class="fw-bold px-3">Chat</span>
    </button>
    
    <!-- Chat box -->
    <div class="offcanvas offcanvas-end custom-offcanvas" 
    style="z-index: 9999;"
            data-bs-scroll="true" 
            tabindex="-1" 
            id="offcanvas">
            <div class="card-header text-bg-dark d-flex justify-content-between align-items-center p-2" 
                data-bs-theme="dark">
                <button type="button" 
                        class="btn-close position-absolute start-0 ms-2" 
                        data-bs-dismiss="offcanvas" 
                        aria-label="Close">
                </button>
                <div class="w-100 d-flex align-items-center flex-grow-1 justify-content-center">
                    <i class="fas fa-comment"></i>
                    <p class="mb-0 ms-2 fw-bold">Chat Box</p>
                </div>
            </div>

        <!-- Flex container -->
        <div class="d-flex h-100">
          <!-- Tabs -->
            <ul class="nav flex-column nav-tabs custom-tabs">
                <li class="nav-item">
                    <a class="nav-link" 
                    :class="{ active: activeTab === 'online' }" 
                    @click="activeTab = 'online'"
                    title="Online Users">
                        <i class="fas fa-user"></i>
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" 
                    :class="{ active: activeTab === 'public' }" 
                    @click="activeTab = 'public'"
                    title="Public Chatroom">
                        <i class="fas fa-users"></i>
                    </a>
                </li>
                <li class="nav-item" v-for="user in users" :key="user">
                    <a class="nav-link" 
                    :class="{ active: activeTab === user }" 
                    @click="activeTab = user"
                    @contextmenu.prevent="removetab(user)"
                    :title="user">
                        {{ user.charAt(0).toUpperCase() }}
                    </a>
                </li>
            </ul>
          
          <!-- Chat content -->
          <div class="card-body chat-messages flex-grow-1" ref="messageContainer">
            <div v-if="activeTab === 'online'" class="online-users-list">
                <div v-for="user in onlineusers"
                    :key="user" 
                    class="user-item d-flex align-items-center p-2 justify-content-between">
                    <span class="d-flex align-items-center">
                        <span class="online-indicator me-2"></span>
                        <span class="user-name">{{ user }}</span>
                    </span>
                    <span v-if="user !== username" class="d-flex align-items-center">
                        <button class="btn btn-primary square-btn me-1" @click="{addtab(user); if (user !== username) {activeTab = user}}">
                            <i class="fas fa-comments"></i>
                        </button>
                        <button :class="['btn btn-primary square-btn', isBlocked(user) ? 'square-btn-red':'']" 
                                title="Block User" 
                                @contextmenu.prevent 
                                @click="{block(user);}">
                            <i class="fas fa-ban"></i>
                        </button>
                    </span>
                </div>
            </div>
            <div v-else-if="activeTab === 'public'">
              <div v-for="(msg, index) in publicMessages" 
                   :key="index" 
                   :class="['chat-message', msg.sender === username ? 'right' : msg.sender !== 'admin' ? 'left' : 'admin']">
                <div class="message-content" :class="{ 'admin-message': msg.sender === 'admin' }">
                  <div class="message-header">
                    <span class="message-username">{{ capitalizeFirstLetter(msg.sender) }}</span>
                    <span class="message-timestamp">{{ msg.time }}</span>
                  </div>
                  <span class="message-text">{{ msg.message }}</span>
                </div>
              </div>
            </div>
            <div v-else>
              <div v-for="(msg, index) in privateMessages[activeTab]" 
                   :key="index" 
                   :class="['chat-message', msg.sender === username ? 'right' : 'left']">
                <div class="message-content">
                  <div class="message-header">
                    <span class="message-username">{{ capitalizeFirstLetter(msg.sender) }}</span>
                    <span class="message-timestamp">{{ msg.time }}</span>
                  </div>
                  <span class="message-text">{{ msg.message }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- input -->
        <div class="card-footer">
            <div class="input-group">
                <input type="text" 
                        class="form-control"
                        v-model="newMessage"
                        @keyup.enter="sendMessage"
                        :placeholder="`${username}: Type a message...`">
                <button class="btn btn-primary"
                        @click="sendMessage">
                    <i class="fas fa-paper-plane"></i><span class="fw-bold"> Send</span>
                </button>
            </div>
        </div>
    </div>

</template>

<script>
export default {
    name: 'ChatBox',
    props: {
        username: {
            type: String,
            required: true
        }
    },
    data() {
        return {
            chatSocket: null,
            publicMessages: [],
            privateMessages: {},
            newMessage: '',
            recipient: '',
            activeTab: 'public',
            users: [],
            blocked: [],
            onlineusers: [],
        }
    },
    methods: {
        initWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
            const wsUrl = `${protocol}${window.location.host}/api/chat/?username=${this.username}`;
            
            console.log('Connecting to:', wsUrl);
            this.chatSocket = new WebSocket(wsUrl);
            
            this.chatSocket.onopen = () => {
                console.log("WebSocket connection established");
            };
            
            this.chatSocket.onclose = () => {
                console.log("WebSocket connection closed");
            };
            
            this.chatSocket.onmessage = (e) => {
                const data = JSON.parse(e.data);
                if (data.recipient === 'update_online_users') {
                    this.onlineusers = JSON.parse(data.message).sort((a, b) => {return a.localeCompare(b);});
                } else if (data.recipient === 'public') {
                    if (!this.blocked.includes(data.sender))
                        this.publicMessages.push(data);
                } else {
                    if (!this.privateMessages[data.sender]) {
                        this.privateMessages[data.sender] = [];
                    }
                    if (!this.blocked.includes(data.sender))
                        this.privateMessages[data.sender].push(data);
                    if (!this.privateMessages[data.recipient]) {
                        this.privateMessages[data.recipient] = [];
                    }
                    if (!this.blocked.includes(data.recipient))
                        this.privateMessages[data.recipient].push(data);
                    if (!this.blocked.includes(data.sender))
                        this.addtab(data.sender);
                }
                this.$nextTick(() => {
                    this.scrollToBottom();
                });
            };
        },
        
        sendMessage() {
            if (!this.newMessage.trim()) return;
            
            const messageData = {
                message: this.newMessage,
                sender: this.username,
                recipient: this.activeTab === 'public' ? 'public' : this.activeTab,
                time: new Date().toLocaleTimeString()
            };
            
            this.chatSocket.send(JSON.stringify(messageData));
            this.newMessage = '';
        },
        
        scrollToBottom() {
            const container = this.$refs.messageContainer;
            container.scrollTop = container.scrollHeight;
        },
        
        capitalizeFirstLetter(string) {
            if (!string) return '';
            return string.charAt(0).toUpperCase() + string.slice(1);
        },

        addtab(user) {
            if (!this.users.includes(user) && user !== this.username)
                this.users.push(user);
        },

        removetab(user) {
            this.users = this.users.filter(u => u !== user);
            this.activeTab = 'public';
        },

        block(user) {
            if (!this.blocked.includes(user)) {
                this.blocked.push(user);
            } else {
                this.blocked = this.blocked.filter(u => u !== user);
            }
        },

        isBlocked(user) {
            return this.blocked.includes(user);
        },
    },
    mounted() {
        this.initWebSocket();
    },
    beforeUnmount() {
        if (this.chatSocket) {
            this.chatSocket.close();
        }
    }
}
</script>

<style scoped>
.chat-message.admin .message-content {
    background: none;
    text-align: center;
    color: gray;
    padding: 0;
    margin: 0;
}

.chat-message.admin .message-header {
    display: none; /* Hide the header for admin messages if needed */
}

.chat-message.admin .message-text {
    display: inline-block;
    background: none;
    padding: 0;
    margin: 0;
    font-style: italic;
}

.square-btn {
    width: 40px; /* Set the desired width */
    height: 40px; /* Set the same value for height to make it square */
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0; /* Remove padding to ensure the icon is centered */
}

.square-btn-red {
    background-color: #dc3545 !important;
    color: white;
}

.online-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #42b983;
}

.user-item {
    border-radius: 4px;
    transition: background-color 0.3s;
    background-color: #dee2e6;
    min-height: 50px;
}

.user-item:hover {
    background-color: rgba(255, 255, 255, 0.1);
    cursor: pointer;
}

.user-name {
    font-weight: 500;
}

.custom-tabs {
  border-right: 1px solid #dee2e6;
  border-top: none;
}

.custom-tabs .nav-link {
    border-top-left-radius: 0.25rem;
    border-bottom-left-radius: 0.25rem;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    border-right: none;
    margin-right: -1px;
    text-align: center;
    width: 40px;  /* 固定宽度 */
    padding: 8px 0;  /* 调整内边距 */
    font-weight: bold;  /* 加粗字体 */
    transition: all 0.3s ease;
}

.custom-tabs .nav-link:hover {
    background-color: rgba(255, 255, 255, 0.2);
    font-weight: 900;
    transform: scale(1.05);
}

.custom-tabs .nav-link.active {
    background-color: rgba(255, 255, 255, 0.3);
    border-color: #dee2e6 transparent #dee2e6 #dee2e6;
}

.custom-tabs .nav-link.active:hover {
    background-color: rgba(255, 255, 255, 0.4);
}

.custom-offcanvas {
    background-color: rgba(0, 0, 0, 0) !important;
    width: 500px !important;
}

.chat-messages {
    max-height: 100vh;
    overflow-y: auto;
    padding: 1rem;
    background: rgba(54, 54, 54, 0.8);

    scrollbar-width: thin;
    scrollbar-color: #42b983 #f1f1f1;
}

.chat-message {
    margin: 5px;
    padding: 5px;
}

.chat-message.right {
    text-align: right;
}

.chat-message.left {
    text-align: left;
}

.message-text {
    word-wrap: break-word;
    white-space: pre-wrap;
    overflow-wrap: break-word; 
}

.message-content {
    display: inline-block;
    padding: 8px 12px;
    border-radius: 8px;
    max-width: 85%;
}

.right .message-content {
    background-color: #42b983;
    color: white;
    text-align: left;
}

.left .message-content {
    background-color: #f1f1f1;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.message-username {
    font-weight: bold;
    display: block;
    margin-bottom: 4px;
}

.message-timestamp {
    font-size: 0.8em;
    margin-left: 8px;
}

.right .message-timestamp {
    color: #f3e1e1;
}

.left .message-timestamp {
    color: #888;
}

button {
    background-color: #42b983;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

button:hover {
    background-color: #3aa876;
}
</style>