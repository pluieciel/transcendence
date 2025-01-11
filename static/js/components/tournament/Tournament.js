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
                            <div class="row" id="top"></div>
                            <div class="row" id="twoToOne"></div>
                            <div class="row" id="fourToTwo"></div>
                            <div class="row" id="eightToFour"></div>
                        </div>
                        <div class="modal-footer"></div>
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

            this.renderOneRound(this.info.round1, eightToFour);
            this.renderOneRound(this.info.round2, fourToTwo);
            this.renderOneRound(this.info.round3, twoToOne);

            const winner = Object.values(this.info.round3)?.[0]?.winner;
            this.renderOnePlayer(winner, winner).then(html => {top.innerHTML = html;});
        }
    }

    addEventListeners() {
        const joinTournamentButton = this.container.querySelector("#joinTournamentButton");
        const quitTournamentButton = this.container.querySelector("#quitTournamentButton");
        joinTournamentButton.addEventListener("click", () => {
            if (!this.info.wait_list.includes(this.username)) {
                joinTournamentButton.disabled = true;
                quitTournamentButton.disabled = false;
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
        quitTournamentButton.addEventListener("click", () => {
            if (this.info.wait_list.includes(this.username)) {
                joinTournamentButton.disabled = false;
                quitTournamentButton.disabled = true;
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

    renderOneRound(round, container) {
        const games = Object.values(round);
        Promise.all(games.map(async game => {
            const promise1 = this.renderOnePlayer(game.p1, game.winner);
            const promise2 = this.renderOnePlayer(game.p2, game.winner);
            return Promise.all([promise1, promise2]).then(htmlParts => {
                return htmlParts.join('');
            });
        })).then(results => {
            container.innerHTML = results.join('');
        });
    }

    async renderOnePlayer(player, winner) {
        if (player) {
            const avatar = await window.app.getAvatar(player);
            return `
                <div class="col border p-2">
                    <div class="user-item d-flex align-items-center p-2 ${winner === player ? 'bg-success-subtle' : winner ? 'bg-danger-subtle' : ''}">
                        <span class="d-flex align-items-center">
                            <img src="${avatar}" width="30" height="30"></img>
                            <span class="user-name ms-2">${player}</span>
                        </span>
                    </div>
                </div>`;
        } else {
            return `
                <div class="col border p-2">
                    <div class="user-item d-flex align-items-center p-2"></div>
                </div>`;
        }
    }
}