from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
import json


@require_http_methods(["POST"])
async def signup(request):
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        
        print(username, password)
        
        return JsonResponse({
            'success': True,
            'message': 'Signup successful'
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=400)