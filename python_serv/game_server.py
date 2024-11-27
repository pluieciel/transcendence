import asyncio
import websockets
import json
import time

class GameState:
    def __init__(self):
        self.player_left = {
            "name": "Player 1",
            "rank": 1500,
            "position": {"x": -18, "y": -3, "z": -15},
            "score": 0,
            "moving": 0  # 0: idle, 1: up, -1: down
        }
        self.player_right = {
            "name": "Player 2",
            "rank": 1200,
            "position": {"x": 18, "y": -3, "z": -15},
            "score": 0,
            "moving": 0
        }
        self.ball = {
            "position": {"x": 0, "y": -3, "z": -15}
        }
        self.paddle_speed = 0.2
        self.last_update = time.time()

    def update(self):
        # Update paddle positions based on their movement state
        if self.player_left["moving"] != 0:
            self.player_left["position"]["y"] += self.player_left["moving"] * self.paddle_speed
            # Add boundary checks
            self.player_left["position"]["y"] = min(max(self.player_left["position"]["y"], -7), 7)

        if self.player_right["moving"] != 0:
            self.player_right["position"]["y"] += self.player_right["moving"] * self.paddle_speed
            # Add boundary checks
            self.player_right["position"]["y"] = min(max(self.player_right["position"]["y"], -7), 7)

    def handle_key_event(self, key, is_down):
        if key == "ArrowUp":
            self.player_left["moving"] = 1 if is_down else 0
        elif key == "ArrowDown":
            self.player_left["moving"] = -1 if is_down else 0

async def game_loop(websocket, game_state):
    try:
        while True:
            game_state.update()

            update = {
                "type": "update",
                "data": {
                    "player": {
                        "left": {
                            "position": game_state.player_left["position"],
                            "score": game_state.player_left["score"]
                        },
                        "right": {
                            "position": game_state.player_right["position"],
                            "score": game_state.player_right["score"]
                        }
                    },
                    "ball": {
                        "position": game_state.ball["position"]
                    }
                }
            }

            try:
                await websocket.send(json.dumps(update))
            except websockets.exceptions.ConnectionClosed:
                break

            await asyncio.sleep(1/60)  # Target 60 FPS

    except Exception as e:
        print(f"Error in game loop: {e}")

async def handle_client(websocket):
    game_state = GameState()
    game_loop_task = None

    try:
        async for message in websocket:
            data = json.loads(message)

            if data["type"] == "init":
                # Send initial game state
                print("Received init message " + message)
                response = {
                    "type": "init_response",
                    "data": {
                        "player": {
                            "left": {
                                "name": game_state.player_left["name"],
                                "rank": game_state.player_left["rank"]
                            },
                            "right": {
                                "name": game_state.player_right["name"],
                                "rank": game_state.player_right["rank"]
                            }
                        }
                    }
                }
                await websocket.send(json.dumps(response))
                # Start the game loop after initialization
                game_loop_task = asyncio.create_task(game_loop(websocket, game_state))

            elif data["type"] == "keydown":
                print("Received keydown message " + message)
                game_state.handle_key_event(data["key"], True)

            elif data["type"] == "keyup":
                print("Received keyup message  " + message)
                game_state.handle_key_event(data["key"], False)

    except websockets.exceptions.ConnectionClosed:
        print("Client disconnected")
    finally:
        if game_loop_task:
            game_loop_task.cancel()
            try:
                await game_loop_task
            except asyncio.CancelledError:
                pass

async def main():
    async with websockets.serve(handle_client, "localhost", 8765):
        print("Server started on ws://localhost:8765")
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    asyncio.run(main())
