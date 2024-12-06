"""
ASGI config for backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from Chat.routing import websocket_urlpatterns as chat_websocket_patterns
from Game.routing import websocket_urlpatterns as game_websocket_patterns
from django.urls import path

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

websocket_patterns = [
    path('api/chat/', URLRouter(chat_websocket_patterns)),
    path('api/game/', URLRouter(game_websocket_patterns)),
]

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(websocket_patterns)
    ),
})
