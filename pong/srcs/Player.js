export class Player {
	static State = Object.freeze({
		UP: "up",
		DOWN: "down",
		IDLE: "idle",
	});
	constructor(id, name, elo, paddle) {
		this.id = id;
		this.name = name;
		this.score = 0;
		this.elo = elo;
		this.paddle = paddle;
		this.state = Player.State.IDLE;
	}
}

