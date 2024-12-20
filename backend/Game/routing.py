from django.urls import path, include
from Game.consumer import GameConsumer

# the empty string routes to ChatConsumer, which manages the chat functionality.
websocket_urlpatterns = [
    path('', GameConsumer.as_asgi()),
]
