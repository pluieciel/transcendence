import { Game } from "../game/Game.js";

export default class Tournament {
    constructor(container) {
        this.container = container;
        this.token = window.app.getToken();
        const decodedPayload = jwt_decode(this.token);
        this.username = decodedPayload.username;
        this.protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        this.host = window.location.host;
        this.info = {"state": "Waiting", "wait_list": [], "round1": {}, "round2": {}, "round3": {}};
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
                            <h1 class="fs-5">/4</h1>
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
                            <!--div class="row" id="eightToFour"></div-->
                        </div>
                        <div class="modal-footer">
                            <div id="tournamentRound1"></div>
                            <div id="tournamentRound2"></div>
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
            if (this.info.wait_list.length === 4) {
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

            //const eightToFour = this.container.querySelector("#eightToFour");
            const fourToTwo = this.container.querySelector("#fourToTwo");
            const twoToOne = this.container.querySelector("#twoToOne");
            const top = this.container.querySelector("#top");

            //this.renderOneRound(this.info.round1, eightToFour);
            this.renderOneRound(this.info.round1, fourToTwo);
            this.renderOneRound(this.info.round2, twoToOne);

            const winner = Object.values(this.info.round2)?.[0]?.winner;
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

    updateGame() {
        if (this.info.state === "Playing4to2") {
            Object.entries(this.info.round1).forEach(([key, value]) => {
                if (value.state === "prepare" && (value.p1 === this.username || value.p2 === this.username)) {
                    const buttonPlace1 = this.container.querySelector("#tournamentRound1");
                    buttonPlace1.innerHTML = `
                        <button type="button" class="btn btn-primary" id="GameButton1" data-bs-dismiss="modal">Ready</button>`;
                    const gameButton1 = this.container.querySelector("#GameButton1");
                    gameButton1.onclick = () => {
                        //start game for this user
                        this.round2_place = key === "game1" ? 1 : 2;
                        window.app.gamews = new WebSocket(`${this.protocol}${this.host}/ws/game/?token=${this.token}&round=1&p1=${value.p1}&p2=${value.p2}&game=${key}`);
                        console.log(`${this.protocol}${this.host}/ws/game/?token=${this.token}&round=1&p1=${value.p1}&p2=${value.p2}`);
                        window.app.gamews.onmessage = (event) => {
                            const events = JSON.parse(event.data);
                            if (events.message_type === "init") {
                                setTimeout(() => {
                                    const canvas = document.querySelector("#gameCanvas");
                                    const game = new Game(canvas, window.app.gamews);
                                    const gameDiv = document.querySelector("#gameDiv");
                                    gameDiv.style.display = "block";
                                    canvas.style.display = "block";
                                    console.log("Game initialization");

                                    game.onGameEnd = () => {
                                        const returnButton = document.querySelector("#returnButton");
                                        returnButton.style.display = "block";

                                        returnButton.onclick = () => {
                                            canvas.style.display = "none";
                                            returnButton.style.display = "none";
                                            document.querySelector("#mainPage").style.display = "block";
                                            document.querySelector("#overlay").style.display = "none";
                                            gameDiv.style.display = "none";
                                            if (window.app.gamews) {
                                                window.app.gamews.close();
                                            }
                                            window.app.ingame = false;
                                            sessionStorage.setItem("ingame", "false");
                                        };
                                    };

                                    game.initialize(events.data);
                                    document.querySelector("#mainPage").style.display = "none";
                                }, 1000);
                            }
                        };
                        buttonPlace1.innerHTML = "";
                    };
                }
            });
        } else if (this.info.state === "Playing2to1") {
            this.container.querySelector("#joinTournamentButton").disabled = false;
            this.container.querySelector("#quitTournamentButton").disabled = true;
            Object.entries(this.info.round2).forEach(([key, value]) => {
                if (value.state === "prepare" && (value.p1 === this.username || value.p2 === this.username)) {
                    this.container.querySelector("#tournamentRound1").innerHTML = "";
                    const buttonPlace2 = this.container.querySelector("#tournamentRound2");
                    buttonPlace2.innerHTML = `
                        <button type="button" class="btn btn-primary" id="GameButton2" data-bs-dismiss="modal">Ready</button>`;
                    const gameButton2 = this.container.querySelector("#GameButton2");
                    gameButton2.onclick = () => {
                        //start game for this user
                        this.round2_place = key === "game1" ? 1 : 2;
                        window.app.gamews = new WebSocket(`${this.protocol}${this.host}/ws/game/?token=${this.token}&round=2&p1=${value.p1}&p2=${value.p2}`);
                        console.log(`${this.protocol}${this.host}/ws/game/?token=${this.token}&round=2&p1=${value.p1}&p2=${value.p2}`);
                        window.app.gamews.onmessage = (event) => {
                            const events = JSON.parse(event.data);
                            if (events.message_type === "init") {
                                setTimeout(() => {
                                    const canvas = document.querySelector("#gameCanvas");
                                    const game = new Game(canvas, window.app.gamews);
                                    const gameDiv = document.querySelector("#gameDiv");
                                    gameDiv.style.display = "block";
                                    canvas.style.display = "block";
                                    console.log("Game initialization");

                                    game.onGameEnd = () => {
                                        const returnButton = document.querySelector("#returnButton");
                                        returnButton.style.display = "block";

                                        returnButton.onclick = () => {
                                            canvas.style.display = "none";
                                            returnButton.style.display = "none";
                                            document.querySelector("#mainPage").style.display = "block";
                                            document.querySelector("#overlay").style.display = "none";
                                            gameDiv.style.display = "none";
                                            if (window.app.gamews) {
                                                window.app.gamews.close();
                                            }
                                            window.app.ingame = false;
                                            sessionStorage.setItem("ingame", "false");
                                        };
                                    };

                                    game.initialize(events.data);
                                    document.querySelector("#mainPage").style.display = "none";
                                }, 1000);
                            }
                        };
                        buttonPlace2.innerHTML = "";
                    };
                }
            });
        }
    }
}
