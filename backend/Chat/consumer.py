import json
from channels.generic.websocket import AsyncWebsocketConsumer
from urllib.parse import parse_qs
from channels.layers import get_channel_layer
from datetime import datetime
from django.contrib.auth import get_user_model, authenticate
from channels.db import database_sync_to_async
import jwt
import os

SECRET_KEY = os.environ.get('JWT_SECRET_KEY')

class ChatConsumer(AsyncWebsocketConsumer):
    online_users = set()
    waiting_users = set()
    tournament_wait_list = set()
    tournament_state = "Waiting"
    def __init__(self, *args, **kwargs):
        from api.models import register_invite, is_valid_invite
        super().__init__(*args, **kwargs)
        self.username = None
        self.room_group_name = None
        self.register_invite = register_invite
        self.is_valid_invite = is_valid_invite

    async def connect(self):
        query_string = self.scope["query_string"].decode()
        query_params = parse_qs(query_string)
        self.token = query_params.get("token", [None])[0]
        try:
            payload = jwt.decode(self.token, SECRET_KEY, algorithms=['HS256'])
            self.username = payload.get('username')

        except jwt.ExpiredSignatureError:
            return
        except jwt.InvalidTokenError:
            return

        self.room_group_name = f"user_{self.username}"
        
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
        all_users = await self.get_all_usernames()
        for group in [key for key in channel_layer.groups.keys() if key.startswith("user_")]:
            await self.channel_layer.group_send(
                group, {
                    "type": "send_message",
                    "message": json.dumps({
                        "online_users": list(ChatConsumer.online_users),
                        "waiting_users": list(ChatConsumer.waiting_users),
                        "tournament_wait_list": list(ChatConsumer.tournament_wait_list),
                        "tournament_state": ChatConsumer.tournament_state
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
            await self.channel_layer.group_send(
                group, {
                    "type": "send_message",
                    "message": "all_user_list",
                    "message_type": "system",
                    "sender": "admin",
                    "recipient": "public",
                    'usernames': all_users,
                    "time": datetime.now().strftime("%H:%M:%S")
                }
            )

        #update friend list
        user = await self.get_user(self.username)
        friends = await self.get_friends_usernames(user)
        await self.send(text_data=json.dumps({
            'type': 'friend_list',
            'usernames': friends
        }))

    @database_sync_to_async
    def get_all_usernames(self):
        """Fetch all usernames from the database."""
        User = get_user_model()
        users = User.objects.exclude(username='django').values_list('username', flat=True)
        return list(users)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        if self.username in ChatConsumer.online_users:
            ChatConsumer.online_users.remove(self.username)
        if self.username in ChatConsumer.waiting_users:
            ChatConsumer.waiting_users.remove(self.username)
        if ChatConsumer.tournament_state == "Waiting" and self.username in ChatConsumer.tournament_wait_list:
            ChatConsumer.tournament_wait_list.remove(self.username)
        channel_layer = get_channel_layer()
        for group in [key for key in channel_layer.groups.keys() if key.startswith("user_")]:
            await self.channel_layer.group_send(
                group, {
                    "type": "send_message",
                    "message": json.dumps({
                        "online_users": list(ChatConsumer.online_users),
                        "waiting_users": list(ChatConsumer.waiting_users),
                        "tournament_wait_list": list(ChatConsumer.tournament_wait_list)
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
        operation = text_data_json.get("operation", None)
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
        elif message_type == "system" and message == "update_tournament_waiting_list":
            if operation == "add" and ChatConsumer.tournament_state == "Waiting":
                ChatConsumer.tournament_wait_list.add(self.username)
                if len(ChatConsumer.tournament_wait_list) == 8:
                    ChatConsumer.tournament_state = "Playing8to4"
            elif operation == "remove" and self.username in ChatConsumer.tournament_wait_list and ChatConsumer.tournament_state == "Waiting":
                ChatConsumer.tournament_wait_list.remove(self.username)

            for group in [key for key in channel_layer.groups.keys() if key.startswith("user_")]:
                await self.channel_layer.group_send(
                    group, {
                        "type": "send_message",
                        "tournament_wait_list": list(ChatConsumer.tournament_wait_list),
                        "message_type": "system",
                        "message": "update_tournament_waiting_list",
                        "tournament_state": ChatConsumer.tournament_state,
                        "sender": "admin",
                        "recipient": "update_tournament_waiting_list",
                        "time": datetime.now().strftime("%H:%M:%S")
                    }
                )

        elif message_type == "system" and message == "update_waiting_status":
            if wait_status == True:
                ChatConsumer.waiting_users.add(sender)
            elif wait_status == False and sender in ChatConsumer.waiting_users:
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
                        "sender": self.username,
                        "recipient": recipient,
                        "time": time
                    }
                )
        elif message_type == "system" and message == "invite_user":
            # register invite
            await self.register_invite(await self.get_user(sender), await self.get_user(recipient))

            recipient_group = f"user_{recipient}"
            await self.channel_layer.group_send(
                recipient_group,
                {
                    "type": "send_message",
                    "message": "invites you to play a game",
                    "message_type": "system_invite",
                    "sender": self.username,
                    "recipient": recipient,
                    "game_mode": game_mode,
                    "time": time
                }
            )

        elif message_type == "system_accept" and message == "accept_invite":
            #print("accept invite received", flush=True)
            if await self.is_valid_invite(await self.get_user(recipient), await self.get_user(sender)):
                #print("accept invite valid", flush=True)
                sender_group = f"user_{sender}"
                recipient_group = f"user_{recipient}"
                await self.channel_layer.group_send(
                    recipient_group, {
                        "type": "send_message",
                        "message": "accepted your invite",
                        "message_type": "system_accept",
                        "sender": self.username,
                        "game_mode": game_mode,
                        "recipient": recipient,
                        "time": time
                    }
                )
        
        elif message_type == "system" and message == "addfriend":
            user = await self.get_user(sender)
            newfriendname = text_data_json.get("friend", None)
            newfriend = await self.get_user(newfriendname)
            if newfriendname != sender and not (await self.is_friend(user, newfriendname)):
                await self.add_friend(user, newfriend)

            #update friend list
            friends = await self.get_friends_usernames(user)
            await self.send(text_data=json.dumps({
                'type': 'friend_list',
                'usernames': friends
            }))

        elif message_type == "system" and message == "removefriend":
            user = await self.get_user(sender)
            newfriendname = text_data_json.get("friend", None)
            newfriend = await self.get_user(newfriendname)
            if (await self.is_friend(user, newfriendname)):
                await self.remove_friend(user, newfriend)

            #update friend list
            friends = await self.get_friends_usernames(user)
            await self.send(text_data=json.dumps({
                'type': 'friend_list',
                'usernames': friends
            }))

    @database_sync_to_async
    def get_user(self, username):
        User = get_user_model()
        user = User.objects.get(username=username)
        return user
    
    @database_sync_to_async
    def get_friends_usernames(self, user):
        """Fetch friend usernames from the database."""
        return list(user.friends.values_list('username', flat=True))
    
    @database_sync_to_async
    def is_friend(self, user, friendname):
        return user.friends.filter(username=friendname).exists()
    
    @database_sync_to_async
    def add_friend(self, user, friend):
        user.friends.add(friend)

    @database_sync_to_async
    def remove_friend(self, user, friend):
        user.friends.remove(friend)

    async def send_message(self, event):
        message = event["message"]
        sender = event["sender"]
        recipient = event["recipient"]
        time = event["time"]
        message_type = event["message_type"]
        game_mode = event.get("game_mode", None)
        usernames = event.get("usernames", None)
        tournament_wait_list = event.get("tournament_wait_list", None)
        tournament_state = event.get("tournament_state", None)
        # 发送消息到 WebSocket
        await self.send(text_data=json.dumps({
            "message": message,
            "message_type": message_type,
            "sender": sender,
            "recipient": recipient,
            "game_mode": game_mode,
            "usernames" : usernames,
            "time": time,
            "tournament_wait_list": tournament_wait_list,
            "tournament_state": tournament_state
        }))
