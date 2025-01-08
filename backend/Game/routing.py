from django.urls import path, include
from Game.consumer import GameConsumer
from Game.consumer_inv import GameConsumerInvite
# the empty string routes to ChatConsumer, which manages the chat functionality.
websocket_urlpatterns = [
    path('', GameConsumer.as_asgi()),
]

websocket_urlpatterns2 = [
    path('', GameConsumerInvite.as_asgi()),
]