import json
from channels.generic.websocket import AsyncWebsocketConsumer
from urllib.parse import parse_qs
from channels.layers import get_channel_layer
from datetime import datetime

class ChatConsumer(AsyncWebsocketConsumer):
    online_users = set()
    waiting_users = set()
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.username = None
        self.room_group_name = None

    async def connect(self):
        #print("Query string:", self.scope.get("query_string", b""))

        query_string = self.scope["query_string"].decode()
        #print("Decoded query string:", query_string)

        query_params = parse_qs(query_string)
        #print("Parsed params:", query_params)

        self.username = query_params.get("username", [None])[0]
        #print("Username:", self.username, "$")

        self.room_group_name = f"user_{self.username}"
        #print(self.username)
        
        if self.username is None:
            await self.close()
            print("No username provided")
            return
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

        if self.username:
            ChatConsumer.online_users.add(self.username)
            ChatConsumer.waiting_users.add(self.username)

        channel_layer = get_channel_layer()
        for group in [key for key in channel_layer.groups.keys() if key.startswith("user_")]:
            await self.channel_layer.group_send(
                group, {
                    "type": "send_message",
                    "message": json.dumps({
                        "online_users": list(ChatConsumer.online_users),
                        "waiting_users": list(ChatConsumer.waiting_users)
                    }),
                    "message_type": "system",
                    "sender": "admin",
                    "recipient": "update_online_users",
                    "time": datetime.now().strftime("%H:%M:%S")
                }
            )
            await self.channel_layer.group_send(
                group, {
                    "type": "send_message",
                    "message": f"{self.username} has joined the chat",
                    "message_type": "system",
                    "sender": "admin",
                    "recipient": "public",
                    "time": datetime.now().strftime("%H:%M:%S")
                }
            )
            

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        ChatConsumer.online_users.remove(self.username)

        channel_layer = get_channel_layer()
        for group in [key for key in channel_layer.groups.keys() if key.startswith("user_")]:
            await self.channel_layer.group_send(
                group, {
                    "type": "send_message",
                    "message": json.dumps({
                        "online_users": list(ChatConsumer.online_users),
                        "waiting_users": list(ChatConsumer.waiting_users)
                    }),
                    "message_type": "system",
                    "sender": "admin",
                    "recipient": "update_online_users",
                    "time": datetime.now().strftime("%H:%M:%S")
                }
            )
            await self.channel_layer.group_send(
                group, {
                    "type": "send_message",
                    "message": f"{self.username} has left the chat",
                    "message_type": "system",
                    "sender": "admin",
                    "recipient": "public",
                    "time": datetime.now().strftime("%H:%M:%S")
                }
            )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json.get("message")
        sender = text_data_json.get("sender")
        recipient = text_data_json.get("recipient")
        time = text_data_json.get("time", None)
        wait_status = text_data_json.get("wait_status", None)
        message_type = text_data_json.get("message_type", None)
        game_mode = text_data_json.get("game_mode", None)
        channel_layer = get_channel_layer()
        if recipient == "public":
            for group in [key for key in channel_layer.groups.keys() if key.startswith("user_")]:
                await self.channel_layer.group_send(
                    group, {
                        "type": "send_message",
                        "message": message,
                        "message_type": "chat",
                        "sender": sender,
                        "recipient": recipient,
                        "time": time
                    }
                )
        elif message_type == "system" and message == "update_waiting_status":
            if wait_status == "true":
                ChatConsumer.waiting_users.add(sender)
            else:
                ChatConsumer.waiting_users.remove(sender)
            for group in [key for key in channel_layer.groups.keys() if key.startswith("user_")]:
                await self.channel_layer.group_send(
                    group, {
                        "type": "send_message",
                        "message": json.dumps(list(ChatConsumer.waiting_users)),
                        "message_type": "system",
                        "sender": "admin",
                        "recipient": "update_waiting_users",
                        "time": datetime.now().strftime("%H:%M:%S")
                    }
                )
        elif message_type == "chat":
            sender_group = f"user_{sender}"
            recipient_group = f"user_{recipient}"
            
            print(f"Sender group: {sender_group}")
            print(f"Recipient group: {recipient_group}")
            
            for group in [sender_group, recipient_group]:
                await self.channel_layer.group_send(
                    group,
                    {
                        "type": "send_message",
                        "message": message,
                        "message_type": "chat",
                        "sender": sender,
                        "recipient": recipient,
                        "time": time
                    }
                )
        elif message_type == "system" and message == "invite_user":
            recipient_group = f"user_{recipient}"
            await self.channel_layer.group_send(
                recipient_group,
                {
                    "type": "send_message",
                    "message": "invites you to play a game",
                    "message_type": "system_invite",
                    "sender": sender,
                    "recipient": recipient,
                    "game_mode": game_mode,
                    "time": time
                }
            )

        elif message_type == "system_accept" and message == "accept_invite":
            sender_group = f"user_{sender}"
            recipient_group = f"user_{recipient}"
            await self.channel_layer.group_send(
                recipient_group, {
                    "type": "send_message",
                    "message": "accepted your invite",
                    "message_type": "system_accept",
                    "sender": sender,
                    "game_mode": game_mode,
                    "recipient": recipient,
                    "time": time
                }
            )

    async def send_message(self, event):
        message = event["message"]
        sender = event["sender"]
        recipient = event["recipient"]
        time = event["time"]
        message_type = event["message_type"]
        game_mode = event.get("game_mode", None)
        # 发送消息到 WebSocket
        await self.send(text_data=json.dumps({
            "message": message,
            "message_type": message_type,
            "sender": sender,
            "recipient": recipient,
            "game_mode": game_mode,
            "time": time
        }))