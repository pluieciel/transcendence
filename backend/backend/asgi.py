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
from api.views import SignupConsumer, LoginConsumer, ProfileConsumer, HandleOAuthConsumer
from api.views2 import RemoveConsumer, setThemeConsumer
from django.contrib import admin

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

websocket_patterns = [
    path('ws/chat/', URLRouter(chat_websocket_patterns)),
    path('ws/game/', URLRouter(game_websocket_patterns)),
]

http_patterns = [
    path('api/signup/', SignupConsumer.as_asgi()),
    path('api/login/', LoginConsumer.as_asgi()),
    path('api/get/profile', ProfileConsumer.as_asgi()),
    path('api/signup/oauth', HandleOAuthConsumer.as_asgi()),
    path('api/del/user', RemoveConsumer.as_asgi()),
    path('api/change/theme', setThemeConsumer.as_asgi()),
    path('admin/', get_asgi_application()),
]

application = ProtocolTypeRouter({
    "http": URLRouter(http_patterns),
    "websocket": AuthMiddlewareStack(
        URLRouter(websocket_patterns)
    ),
})
