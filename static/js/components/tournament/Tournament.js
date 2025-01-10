export default class Tournament {
    constructor(container) {
        this.container = container;
        this.token = window.app.getToken();
        const decodedPayload = jwt_decode(this.token);
        this.username = decodedPayload.username;
        this.waitingList = [];
        this.render();
        this.tournamentState = undefined;
        this.addEventListeners();
        this.updateContent();
    }
    render() {
        this.container.innerHTML = `
            <!-- Modal for invitation -->
            <div class="modal fade" id="tournamentModal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">

                        <div id="tournamentWaiting">
                            <div class="modal-header">
                                <h1 class="modal-title fs-5" id="staticBackdropLabel">Tournament Waiting List</h1>
                                <h1 id="tournamentWaitingListCount" class="ms-2 fs-5">0</h1>
                                <h1 class="fs-5">/8</h1>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body" id="tournamentWaitingList">
                                ...
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-primary" id="joinTournamentButton">Join</button>
                                <button type="button" class="btn btn-danger" id="quitTournamentButton" disabled>Quit</button>
                            </div>
                        </div>

                        <div id="tournamentPlaying" style="display: none;">
                            <div class="modal-header">
                                <h1 class="modal-title fs-5" id="staticBackdropLabel">Ongoing Tournament</h1>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row" id="top">
                                    <!-- Top -->
                                    <div class="col border p-2">
                                        <div class="user-item d-flex align-items-center p-2 mb-2 justify-content-between"></div>
                                    </div>
                                </div>
                                <div class="row" id="twoToOne">
                                    <!-- 2 to 1 -->
                                    <div class="col border p-2">
                                        <div class="user-item d-flex align-items-center p-2 mb-2 justify-content-between"></div>
                                    </div>
                                    <div class="col border p-2">
                                        <div class="user-item d-flex align-items-center p-2 mb-2 justify-content-between"></div>
                                    </div>
                                </div>
                                <div class="row" id="fourToTwo">
                                    <!-- 4 to 2 -->
                                    <div class="col border p-2">
                                        <div class="user-item d-flex align-items-center p-2 mb-2 justify-content-between"></div>
                                    </div>
                                    <div class="col border p-2">
                                        <div class="user-item d-flex align-items-center p-2 mb-2 justify-content-between"></div>
                                    </div>
                                    <div class="col border p-2">
                                        <div class="user-item d-flex align-items-center p-2 mb-2 justify-content-between"></div>
                                    </div>
                                    <div class="col border p-2">
                                        <div class="user-item d-flex align-items-center p-2 mb-2 justify-content-between"></div>
                                    </div>
                                </div>
                                <div class="row" id="eightToFour">
                                    <!-- 8 to 4 -->
                                </div>
                            </div>
                            <div class="modal-footer">
                                
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    updateContent() {
        //console.log(this.tournamentState);
        if (this.tournamentState === "Waiting") {
            this.container.querySelector("#tournamentWaiting").style.display = "block";
            this.container.querySelector("#tournamentPlaying").style.display = "none";
            const tournamentWaitingListCount = this.container.querySelector("#tournamentWaitingListCount");
            tournamentWaitingListCount.innerHTML = this.waitingList.length;
            if (this.waitingList.length === 8) {
                this.updateContent();
            }

            const tournamentWaitingList = this.container.querySelector("#tournamentWaitingList");
            tournamentWaitingList.innerHTML = "";
            this.waitingList.forEach(user => {
                tournamentWaitingList.innerHTML += `
                    <div class="user-item d-flex align-items-center p-2 mb-2 justify-content-between">
                        <span class="d-flex align-items-center">
                            <div id="avatar_${user}"></div>
                            <span class="user-name ms-2">${user}</span>
                        </span>
                    </div>`;
            });
            this.waitingList.map(async (user) => {
                const avatar_div = this.container.querySelector(`#avatar_${user}`);
                if (avatar_div) {
                    const avatarUrl = await window.app.getAvatar(user);
                    if (avatarUrl) {
                        avatar_div.innerHTML = `<img src="${avatarUrl}" width="30" height="30"></img>`;
                    }
                }
            });
        } else if (this.tournamentState === "Playing8to4") {
            this.container.querySelector("#tournamentWaiting").style.display = "none";
            this.container.querySelector("#tournamentPlaying").style.display = "block";
            
            //TODO: match the 8 users into 4 groups of 2

            const eightToFour = this.container.querySelector("#eightToFour");
            eightToFour.innerHTML = "";
            this.waitingList.forEach(user => {
                eightToFour.innerHTML += `
                    <div class="col border p-2">
                        <div class="user-item d-flex align-items-center p-2 mb-2 justify-content-between">
                            <span class="d-flex align-items-center">
                                <div id="avatar2_${user}"></div>
                                <span class="user-name ms-2">${user}</span>
                            </span>
                        </div>
                    </div>`;
            });
            this.waitingList.map(async (user) => {
                const avatar_div = this.container.querySelector(`#avatar2_${user}`);
                if (avatar_div) {
                    const avatarUrl = await window.app.getAvatar(user);
                    if (avatarUrl) {
                        avatar_div.innerHTML = `<img src="${avatarUrl}" width="30" height="30"></img>`;
                    }
                }
            });
        }
    }

    addEventListeners() {
        const joinTournamentButton = this.container.querySelector("#joinTournamentButton");
        joinTournamentButton.addEventListener("click", () => {
            if (!this.waitingList.includes(this.username)) {
                this.container.querySelector("#joinTournamentButton").disabled = true;
                this.container.querySelector("#quitTournamentButton").disabled = false;
                this.waitingList.push(this.username);
                const messageData = {
                    message: "update_tournament_waiting_list",
                    sender: this.username,
                    operation: "add",
                    recipient: "admin",
                    message_type: "system",
                    time: new Date().toLocaleTimeString()
                };
                window.app.chatBox.chatSocket.send(JSON.stringify(messageData));
            }
        });
        const quitTournamentButton = this.container.querySelector("#quitTournamentButton");
        quitTournamentButton.addEventListener("click", () => {
            if (this.waitingList.includes(this.username)) {
                this.container.querySelector("#joinTournamentButton").disabled = false;
                this.container.querySelector("#quitTournamentButton").disabled = true;
                this.waitingList = this.waitingList.filter(user => user !== this.username);
                const messageData = {
                    message: "update_tournament_waiting_list",
                    sender: this.username,
                    operation: "remove",
                    recipient: "admin",
                    message_type: "system",
                    time: new Date().toLocaleTimeString()
                };
                window.app.chatBox.chatSocket.send(JSON.stringify(messageData));
            }
        });
    }
}