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
from api.consumers.login_2fa import Login2FAConsumer
from api.consumers.enable_2fa import Enable2FAConsumer
from api.consumers.generate_2fa import Generate2FAConsumer
from api.consumers.generate_2fa_recovery import Generate2FARecoveryConsumer
from api.consumers.oauth import OAuthConsumer
from api.consumers.login_oauth import LoginOAuthConsumer
from api.consumers.profile import ProfileConsumer
from api.consumers.profile2 import ProfileConsumer2
from api.consumers.avatar import AvatarConsumer
from api.consumers.login import LoginConsumer
from api.consumers.signup import SignupConsumer
from api.consumers.recaptcha import RecaptchaConsumer
from api.consumers.preferences import getPreferences, setPreferences
from api.consumers.remove import RemoveConsumer
from api.consumers.display import setDisplay
from django.contrib import admin
from django.conf.urls.static import static
from django.conf import settings

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

websocket_patterns = [
    path('ws/chat/', URLRouter(chat_websocket_patterns)),
    path('ws/game/', URLRouter(game_websocket_patterns)),
    path('ws/game/invite', URLRouter(game_websocket_patterns)),
]

http_patterns = [
    path('api/signup/', SignupConsumer.as_asgi()),
    path('api/login/', LoginConsumer.as_asgi()),
    path('api/login/2fa/', Login2FAConsumer.as_asgi()),
    path('api/login/oauth', LoginOAuthConsumer.as_asgi()),
    path('api/settings/2fa/generate/qr', Generate2FAConsumer.as_asgi()),
    path('api/settings/2fa/generate/recovery', Generate2FARecoveryConsumer.as_asgi()),
    path('api/settings/2fa/enable', Enable2FAConsumer.as_asgi()),
    re_path(r'^api/get/profile/.*$', ProfileConsumer2.as_asgi()),
    re_path(r'^api/get/avatar/.*$', AvatarConsumer.as_asgi()),
    path('api/get/profile', ProfileConsumer.as_asgi()),
	path('api/settings/set/preferences', setPreferences.as_asgi()),
	path('api/settings/get/preferences', getPreferences.as_asgi()),
    path('api/del/user', RemoveConsumer.as_asgi()),
    path('api/get/oauth/redirect', OAuthConsumer.as_asgi()),
    path('api/get/recaptcha', RecaptchaConsumer.as_asgi()),
	path('api/settings/set/display', setDisplay.as_asgi()), 
    path('admin/', get_asgi_application()),
]

application = ProtocolTypeRouter({
    "http": URLRouter(http_patterns),
    "websocket": AuthMiddlewareStack(
        URLRouter(websocket_patterns)
    ),
})
