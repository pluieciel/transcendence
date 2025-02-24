from django.urls import path, include
from Game.consumer import GameConsumer
from Game.tournament_consumer import TournamentConsumer
# the empty string routes to ChatConsumer, which manages the chat functionality.
websocket_urlpatterns = [
    path('', GameConsumer.as_asgi()),
]

websocket_urlpatternsTournament = [
    path('', TournamentConsumer.as_asgi()),
]

