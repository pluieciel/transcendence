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
from django.urls import path, re_path
from api.views import SignupConsumer, LoginConsumer, ProfileConsumer, ProfileConsumer2, HandleOAuthConsumer, AvatarConsumer
from api.views2 import RemoveConsumer, setTheme, setNewUsername
from django.contrib import admin
from django.conf.urls.static import static
from django.conf import settings

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

websocket_patterns = [
    path('ws/chat/', URLRouter(chat_websocket_patterns)),
    path('ws/game/', URLRouter(game_websocket_patterns)),
]

http_patterns = [
    path('api/signup/', SignupConsumer.as_asgi()),
    path('api/login/', LoginConsumer.as_asgi()),
    re_path(r'^api/get/profile/.*$', ProfileConsumer2.as_asgi()),
    re_path(r'^api/get/avatar/.*$', AvatarConsumer.as_asgi()),
    path('api/get/profile', ProfileConsumer.as_asgi()),
    path('api/signup/oauth', HandleOAuthConsumer.as_asgi()),
    path('api/del/user', RemoveConsumer.as_asgi()),
    path('api/change/theme', setTheme.as_asgi()),
    path('api/change/username', setNewUsername.as_asgi()),
    path('admin/', get_asgi_application()),
]

application = ProtocolTypeRouter({
    "http": URLRouter(http_patterns),
    "websocket": AuthMiddlewareStack(
        URLRouter(websocket_patterns)
    ),
})
