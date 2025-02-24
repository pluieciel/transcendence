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
from Game.routing import websocket_urlpatternsTournament as tournament_websocket_patterns
from django.urls import path, re_path
from api.consumers.leaderboard import LeaderboardConsumer
from api.consumers.login_2fa import Login2FAConsumer
from api.consumers.login_2fa_recovery import Login2FARecoveryConsumer
from api.consumers.enable_2fa import Enable2FAConsumer
from api.consumers.disable_2fa import Disable2FAConsumer
from api.consumers.generate_2fa_qr import Generate2FAQRConsumer
from api.consumers.generate_2fa_recovery import Generate2FARecoveryConsumer
from api.consumers.oauth import OAuthConsumer
from api.consumers.login_oauth import LoginOAuthConsumer
from api.consumers.game_history import GameHistoryConsumer
from api.consumers.profile import ProfileConsumer
from api.consumers.profile_achievement import ProfileAchievementConsumer
from api.consumers.achievement import AchievementConsumer
from api.consumers.profile_nav import ProfileNavConsumer
from api.consumers.settings import GetSettingsConsumer, SetSettingsConsumer
from api.consumers.colors import ColorsConsumer
from api.consumers.avatar import AvatarConsumer
from api.consumers.login import LoginConsumer
from api.consumers.signup import SignupConsumer
from api.consumers.recaptcha import RecaptchaConsumer
from api.consumers.easter_egg import EasterEggConsumer
from api.consumers.customize import GetCustomizeConsumer, SetCustomizeConsumer
from api.consumers.delete_user import DeleteUserConsumer
from api.consumers.admin import AdminConsumer
from django.contrib import admin
from django.conf.urls.static import static
from django.conf import settings

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

websocket_patterns = [
    path('ws/chat/', URLRouter(chat_websocket_patterns)),
    path('ws/game/', URLRouter(game_websocket_patterns)),
    path('ws/game/invite', URLRouter(game_websocket_patterns)),
    path('ws/tournament/', URLRouter(tournament_websocket_patterns)),
]

http_patterns = [
    path('api/auth/signup/', SignupConsumer.as_asgi()),
    path('api/auth/login/', LoginConsumer.as_asgi()),
    path('api/auth/login/2fa/', Login2FAConsumer.as_asgi()),
    path('api/auth/login/2fa/recovery/', Login2FARecoveryConsumer.as_asgi()),
    path('api/auth/login/oauth/', LoginOAuthConsumer.as_asgi()),
    path('api/auth/login/oauth/redirect/', OAuthConsumer.as_asgi()),

    path('api/profiles/me/nav/', ProfileNavConsumer.as_asgi()),
    re_path(r'^api/profiles/(?P<username>.*)/avatar/$', AvatarConsumer.as_asgi()),
    re_path(r'^api/profiles/(?P<username>.*)/achievements/$', ProfileAchievementConsumer.as_asgi()),
    re_path(r'^api/profiles/(?P<username>.*)/history/$', GameHistoryConsumer.as_asgi()),
    re_path(r'^api/profiles/(?P<username>.*)/colors/$', ColorsConsumer.as_asgi()),
    re_path(r'^api/profiles/(?P<username>.*)/$', ProfileConsumer.as_asgi()),
    re_path(r'^api/achievements/(?P<username>.*)/$', AchievementConsumer.as_asgi()),
    
    path('api/settings/', GetSettingsConsumer.as_asgi()),
    path('api/settings/update/', SetSettingsConsumer.as_asgi()),
	path('api/settings/customize/', GetCustomizeConsumer.as_asgi()),
	path('api/settings/customize/update/', SetCustomizeConsumer.as_asgi()),

    path('api/settings/2fa/qr/generate/', Generate2FAQRConsumer.as_asgi()),
    path('api/settings/2fa/recovery/generate/', Generate2FARecoveryConsumer.as_asgi()),
    path('api/settings/2fa/enable/', Enable2FAConsumer.as_asgi()),
    path('api/settings/2fa/disable/', Disable2FAConsumer.as_asgi()),

    re_path(r'^api/leaderboard/(?P<game_mode>.*)/$', LeaderboardConsumer.as_asgi()),
    path('api/recaptcha/', RecaptchaConsumer.as_asgi()),
    path('api/users/delete/', DeleteUserConsumer.as_asgi()),
	path('api/admin/', AdminConsumer.as_asgi()),
	path('api/credits/', EasterEggConsumer.as_asgi()),
    path('admin/', get_asgi_application()),
]

application = ProtocolTypeRouter({
    "http": URLRouter(http_patterns),
    "websocket": AuthMiddlewareStack(
        URLRouter(websocket_patterns)
    ),
})
