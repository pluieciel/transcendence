export default class Tournament {
    constructor(container) {
        this.container = container;
        this.token = window.app.getToken();
        const decodedPayload = jwt_decode(this.token);
        this.username = decodedPayload.username;
        this.info = {"state": "Waiting", "wait_list": []};
        this.render();
        this.addEventListeners();
        this.updateContent();
    }
    render() {
        this.container.innerHTML = `
            <!-- Modal for invitation -->
            <div class="modal fade" id="tournamentModal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                <div class="modal-dialog" id="tournamentWaiting">
                    <div class="modal-content">
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
                </div>
                <div class="modal-dialog modal-xl" id="tournamentPlaying">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h1 class="modal-title fs-5" id="staticBackdropLabel">Ongoing Tournament</h1>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row" id="top">
                                <!-- Top -->
                                <div class="col border p-2">
                                    <div class="user-item d-flex align-items-center p-2"></div>
                                </div>
                            </div>
                            <div class="row" id="twoToOne">
                                <!-- 2 to 1 -->
                                <div class="col border p-2">
                                    <div class="user-item d-flex align-items-center p-2"></div>
                                </div>
                                <div class="col border p-2">
                                    <div class="user-item d-flex align-items-center p-2"></div>
                                </div>
                            </div>
                            <div class="row" id="fourToTwo">
                                <!-- 4 to 2 -->
                                <div class="col border p-2">
                                    <div class="user-item d-flex align-items-center p-2"></div>
                                </div>
                                <div class="col border p-2">
                                    <div class="user-item d-flex align-items-center p-2"></div>
                                </div>
                                <div class="col border p-2">
                                    <div class="user-item d-flex align-items-center p-2"></div>
                                </div>
                                <div class="col border p-2">
                                    <div class="user-item d-flex align-items-center p-2"></div>
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
        `;
    }

    updateContent() {
        //console.log(this.tournamentState);
        if (this.info.state === "Waiting") {
            this.container.querySelector("#tournamentWaiting").style.display = "block";
            this.container.querySelector("#tournamentPlaying").style.display = "none";
            const tournamentWaitingListCount = this.container.querySelector("#tournamentWaitingListCount");
            tournamentWaitingListCount.innerHTML = this.info.wait_list.length;
            if (this.info.wait_list.length === 8) {
                this.updateContent();
            }

            const tournamentWaitingList = this.container.querySelector("#tournamentWaitingList");
            tournamentWaitingList.innerHTML = "";
            this.info.wait_list.forEach(user => {
                tournamentWaitingList.innerHTML += `
                    <div class="user-item d-flex align-items-center p-2">
                        <span class="d-flex align-items-center">
                            <div id="avatar_${user}"></div>
                            <span class="user-name ms-2">${user}</span>
                        </span>
                    </div>`;
            });
            this.info.wait_list.map(async (user) => {
                const avatar_div = this.container.querySelector(`#avatar_${user}`);
                if (avatar_div) {
                    const avatarUrl = await window.app.getAvatar(user);
                    if (avatarUrl) {
                        avatar_div.innerHTML = `<img src="${avatarUrl}" width="30" height="30"></img>`;
                    }
                }
            });
        } else {
            this.container.querySelector("#tournamentWaiting").style.display = "none";
            this.container.querySelector("#tournamentPlaying").style.display = "block";

            const eightToFour = this.container.querySelector("#eightToFour");
            const fourToTwo = this.container.querySelector("#fourToTwo");
            const twoToOne = this.container.querySelector("#twoToOne");
            const top = this.container.querySelector("#top");

            const games1 = Object.values(this.info.round1);
            const htmlPromises1 = games1.map(async game => {
                const avatar1 = await window.app.getAvatar(game.p1);
                const avatar2 = await window.app.getAvatar(game.p2);
                return `
                    <div class="col border p-2">
                        <div class="user-item d-flex align-items-center p-2 ${game.winner === game.p1 ? 'bg-success-subtle' : game.winner === game.p2 ? 'bg-danger-subtle' : ''}">
                            <span class="d-flex align-items-center">
                                <img src="${avatar1}" width="30" height="30"></img>
                                <span class="user-name ms-2">${game.p1}</span>
                            </span>
                        </div>
                    </div>
                    <div class="col border p-2">
                        <div class="user-item d-flex align-items-center p-2 ${game.winner === game.p2 ? 'bg-success-subtle' : game.winner === game.p1 ? 'bg-danger-subtle' : ''}">
                            <span class="d-flex align-items-center">
                                <img src="${avatar2}" width="30" height="30"></img>
                                <span class="user-name ms-2">${game.p2}</span>
                            </span>
                        </div>
                    </div>`;
            });
            Promise.all(htmlPromises1).then(htmlParts => {
                eightToFour.innerHTML = htmlParts.join('');
            });

            const games2 = Object.values(this.info.round2);
            if (games2.length !== 0) {
                const htmlPromises2 = games2.map(async game => {
                    const avatar1 = await window.app.getAvatar(game.p1);
                    const avatar2 = await window.app.getAvatar(game.p2);
                    return `
                        <div class="col border p-2">
                            <div class="user-item d-flex align-items-center p-2 ${game.winner === game.p1 ? 'bg-success-subtle' : game.winner === game.p2 ? 'bg-danger-subtle' : ''}">
                                <span class="d-flex align-items-center">
                                    <img src="${avatar1}" width="30" height="30"></img>
                                    <span class="user-name ms-2">${game.p1}</span>
                                </span>
                            </div>
                        </div>
                        <div class="col border p-2">
                            <div class="user-item d-flex align-items-center p-2 ${game.winner === game.p2 ? 'bg-success-subtle' : game.winner === game.p1 ? 'bg-danger-subtle' : ''}">
                                <span class="d-flex align-items-center">
                                    <img src="${avatar2}" width="30" height="30"></img>
                                    <span class="user-name ms-2">${game.p2}</span>
                                </span>
                            </div>
                        </div>`;
                });
                Promise.all(htmlPromises2).then(htmlParts => {
                    fourToTwo.innerHTML = htmlParts.join('');
                });
            }

            const games3 = Object.values(this.info.round3);
            if (games3.length !== 0) {
                const htmlPromises3 = games3.map(async game => {
                    const avatar1 = await window.app.getAvatar(game.p1);
                    const avatar2 = await window.app.getAvatar(game.p2);
                    return `
                        <div class="col border p-2">
                            <div class="user-item d-flex align-items-center p-2 ${game.winner === game.p1 ? 'bg-success-subtle' : game.winner === game.p2 ? 'bg-danger-subtle' : ''}">
                                <span class="d-flex align-items-center">
                                    <img src="${avatar1}" width="30" height="30"></img>
                                    <span class="user-name ms-2">${game.p1}</span>
                                </span>
                            </div>
                        </div>
                        <div class="col border p-2">
                            <div class="user-item d-flex align-items-center p-2 ${game.winner === game.p2 ? 'bg-success-subtle' : game.winner === game.p1 ? 'bg-danger-subtle' : ''}">
                                <span class="d-flex align-items-center">
                                    <img src="${avatar2}" width="30" height="30"></img>
                                    <span class="user-name ms-2">${game.p2}</span>
                                </span>
                            </div>
                        </div>`;
                });
                Promise.all(htmlPromises3).then(htmlParts => {
                    twoToOne.innerHTML = htmlParts.join('');
                });
            }

            const games4 = Object.values(this.info.round3);
            if (games4.game1.winner) {
                const htmlPromises4 = games4.map(async game => {
                    const avatar = await window.app.getAvatar(game.winner);
                    return `
                        <div class="col border p-2">
                            <div class="user-item d-flex align-items-center p-2 ${game.winner?'bg-success-subtle':''}">
                                <span class="d-flex align-items-center">
                                    ${game.winner?`<img src="${avatar}" width="30" height="30"></img>`:''}
                                    <span class="user-name ms-2">${game.winner}</span>
                                </span>
                            </div>
                        </div>`;
                });
                Promise.all(htmlPromises4).then(htmlParts => {
                    top.innerHTML = htmlParts.join('');
                });
            }
        }
    }

    addEventListeners() {
        const joinTournamentButton = this.container.querySelector("#joinTournamentButton");
        joinTournamentButton.addEventListener("click", () => {
            if (!this.info.wait_list.includes(this.username)) {
                this.container.querySelector("#joinTournamentButton").disabled = true;
                this.container.querySelector("#quitTournamentButton").disabled = false;
                this.info.wait_list.push(this.username);
                const messageData = {
                    message: "update_tournament_info",
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
            if (this.info.wait_list.includes(this.username)) {
                this.container.querySelector("#joinTournamentButton").disabled = false;
                this.container.querySelector("#quitTournamentButton").disabled = true;
                this.info.wait_list = this.info.wait_list.filter(user => user !== this.username);
                const messageData = {
                    message: "update_tournament_info",
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