import json
from channels.generic.websocket import AsyncWebsocketConsumer
from urllib.parse import parse_qs
from channels.layers import get_channel_layer
from datetime import datetime
from django.contrib.auth import get_user_model, authenticate
from channels.db import database_sync_to_async
import jwt
import os
import re
from Game.consumer import game_manager
import redis
from copy import deepcopy

def get_cookie(headers, name):
    cookies = headers.get('cookie', None)
    return re.search(f'{name}=([^;]+)', cookies)

def get_secret_from_file(env_var):
    file_path = os.environ.get(env_var)
    if file_path is None:
        raise ValueError(f'{env_var} environment variable not set')
    with open(file_path, 'r') as file:
        return file.read().strip()

class ChatConsumer(AsyncWebsocketConsumer):
    online_users = set()
    waiting_users = set()
    tournament_info_initial = {"state": "Waiting", "wait_list": [],
                                "round1": {"game1":{}, "game2":{}},
                                "round2": {"game1":{}}}
    # use deepcopy to copy the tournament_info for initial state
    tournament_info = deepcopy(tournament_info_initial)
    def __init__(self, *args, **kwargs):
        from api.models import register_invite, is_valid_invite
        super().__init__(*args, **kwargs)
        self.username = None
        self.room_group_name = None
        self.register_invite = register_invite
        self.is_valid_invite = is_valid_invite
        self.redis_client = redis.Redis(host='redis', port=6379, db=0)

    async def connect(self):
        headers_dict = dict((key.decode('utf-8'), value.decode('utf-8')) for key, value in self.scope['headers'])
        jwt_cookie = get_cookie(headers_dict, 'jwt')
        self.token = jwt_cookie.group(1)
        try:
            payload = jwt.decode(self.token, get_secret_from_file('JWT_SECRET_KEY_FILE'), algorithms=['HS256'])
            self.username = payload.get('username')

        except jwt.ExpiredSignatureError:
            return
        except jwt.InvalidTokenError:
            print("InvalidTokenError1", flush=True)
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
            self.redis_client.sadd('active_groups', self.room_group_name)

        groups = [g.decode('utf-8') for g in self.redis_client.smembers('active_groups')]
        all_users = await self.get_all_usernames()
        for group in groups:
            if group.startswith("user_"):
                await self.channel_layer.group_send(
                    group, {
                        "type": "send_message",
                        "message": json.dumps({
                            "online_users": list(ChatConsumer.online_users),
                            "waiting_users": list(ChatConsumer.waiting_users),
                            "tournament_info": ChatConsumer.tournament_info,
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
        self.redis_client.srem('active_groups', str(self.room_group_name))
        # await self.channel_layer.group_discard(
        #     self.room_group_name,
        #     self.channel_name
        # )
        if self.username in ChatConsumer.online_users:
            ChatConsumer.online_users.remove(self.username)
        if self.username in ChatConsumer.waiting_users:
            ChatConsumer.waiting_users.remove(self.username)
        if ChatConsumer.tournament_info["state"] == "Waiting" and self.username in ChatConsumer.tournament_info["wait_list"]:
            ChatConsumer.tournament_info["wait_list"].remove(self.username)
        groups = [g.decode('utf-8') for g in self.redis_client.smembers('active_groups')]
        for group in groups:
            if group.startswith("user_"):
                await self.channel_layer.group_send(
                    group, {
                        "type": "send_message",
                        "message": json.dumps({
                            "online_users": list(ChatConsumer.online_users),
                            "waiting_users": list(ChatConsumer.waiting_users),
                            "tournament_info": ChatConsumer.tournament_info,
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
            groups = [g.decode('utf-8') for g in self.redis_client.smembers('active_groups')]
            for group in groups:
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
        elif message_type == "system" and message == "update_tournament_info":
            if operation == "add" and self.username not in ChatConsumer.tournament_info["wait_list"] and ChatConsumer.tournament_info["state"] == "Waiting":
                ChatConsumer.tournament_info["wait_list"].append(self.username)
                if len(ChatConsumer.tournament_info["wait_list"]) == 4 and ChatConsumer.tournament_info["state"] == "Waiting":
                    # start tournament
                    ChatConsumer.tournament_info["state"] = "Playing4to2"
                    temp = ChatConsumer.tournament_info["wait_list"]
                    #TODO: match making for first round, rewrite following line of code
                    ChatConsumer.tournament_info["round1"] = {f"game{i+1}" : {"p1" : temp[i*2], "p2" : temp[i*2+1], "state" : "prepare"} for i in range(0, 2)}
                    await game_manager.create_tournament_empty_games(ChatConsumer.tournament_info)


            elif operation == "remove" and self.username in ChatConsumer.tournament_info["wait_list"] and ChatConsumer.tournament_info["state"] == "Waiting":
                ChatConsumer.tournament_info["wait_list"].remove(self.username)

            groups = [g.decode('utf-8') for g in self.redis_client.smembers('active_groups')]
            for group in groups:
                await self.channel_layer.group_send(
                    group, {
                        "type": "send_message",
                        "tournament_info": json.dumps(ChatConsumer.tournament_info),
                        "message_type": "system",
                        "message": "update_tournament_info",
                        "sender": "admin",
                        "recipient": "update_tournament_info",
                        "time": datetime.now().strftime("%H:%M:%S")
                    }
                )

        elif message_type == "system" and message == "update_waiting_status":
            if wait_status == True:
                ChatConsumer.waiting_users.add(sender)
            elif wait_status == False and sender in ChatConsumer.waiting_users:
                ChatConsumer.waiting_users.remove(sender)
            groups = [g.decode('utf-8') for g in self.redis_client.smembers('active_groups')]
            for group in groups:
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

        # moved to game consumer, to make sure the game is created before sending message
        # elif message_type == "system_accept" and message == "accept_invite":
        #     #print("accept invite received", flush=True)
        #     if await self.is_valid_invite(await self.get_user(recipient), await self.get_user(sender)):
        #         #print("accept invite valid", flush=True)
        #         sender_group = f"user_{sender}"
        #         recipient_group = f"user_{recipient}"
        #         await self.channel_layer.group_send(
        #             recipient_group, {
        #                 "type": "send_message",
        #                 "message": "accepted your invite",
        #                 "message_type": "system_accept",
        #                 "sender": self.username,
        #                 "game_mode": game_mode,
        #                 "recipient": recipient,
        #                 "time": time
        #             }
        #         )

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
        tournament_info = event.get("tournament_info", None)
        # 发送消息到 WebSocket
        await self.send(text_data=json.dumps({
            "message": message,
            "message_type": message_type,
            "sender": sender,
            "recipient": recipient,
            "game_mode": game_mode,
            "usernames" : usernames,
            "time": time,
            "tournament_info": tournament_info,
        }))
