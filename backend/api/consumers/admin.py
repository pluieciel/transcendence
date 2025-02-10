from channels.generic.http import AsyncHttpConsumer
from api.utils import jwt_to_user
import json

class AdminConsumer(AsyncHttpConsumer):
	async def handle(self, body):
		try:
			user = await jwt_to_user(self.scope['headers'])
			if not user:
				response_data = {
					'success': False,
					'is_jwt_valid': False,
					'message': 'Invalid JWT'
				}
				return await self.send_response(401, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])
			
			if not user.is_admin:
				response_data = {
					'success': False,
					'message': 'User is not an admin'
				}
				return await self.send_response(401, json.dumps(response_data).encode(),
					headers=[(b"Content-Type", b"application/json")])

			response_data = {
				'success': True,
				'admin_view': self.get_admin_view(),
			}
			return await self.send_response(200, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json")])
		except Exception as e:
			response_data = {
				'success': False,
				'message': str(e)
			}
			return await self.send_response(500, json.dumps(response_data).encode(),
				headers=[(b"Content-Type", b"application/json")])

	def get_admin_view(self):
		return """<main id="admin-view">
				<div class="card service-card">
					<h2 id="card-title">
						<img src="/imgs/elasticsearch_logo.webp" alt="Elasticsearch logo" class="service-logo"> ELASTICSEARCH
					</h2>
					<p class="service-description">Search and analytics engine for all application logs and metrics.</p>
					<button id="elasticsearch-button" class="service-button">Go to Elasticsearch</button>
				</div>
				<div class="card service-card">
					<h2 id="card-title">
						<img src="/imgs/kibana_logo.webp" alt="Kibana logo" class="service-logo"> KIBANA
					</h2>
					<p class="service-description">Visualization dashboard for Elasticsearch data and log analysis.</p>
					<button id="kibana-button" class="service-button">Go to Kibana</button>
				</div>
				<div class="card service-card">
					<h2 id="card-title">
						<img src="/imgs/cadvisor_logo.webp" alt="cAdvisor logo" class="service-logo"> CADVISOR
					</h2>
					<p class="service-description">Container resource usage and performance analyzer.</p>
					<button id="cadvisor-button" class="service-button">Go to cAdvisor</button>
				</div>
				<div class="card service-card">
					<h2 id="card-title">
						<i class="fa-solid fa-file-export fa-xs"></i> NODE EXPORTER
					</h2>
					<p class="service-description">Hardware and OS metrics exporter for system monitoring.</p>
					<button id="node-exporter-button" class="service-button">Go to Node Exporter</button>
				</div>
				<div class="card service-card">
					<h2 id="card-title">
						<img src="/imgs/prometheus_logo.webp" alt="Prometheus logo" class="service-logo"> PROMETHEUS
					</h2>
					<p class="service-description">Time series database for metrics collection and alerting.</p>
					<button id="prometheus-button" class="service-button">Go to Prometheus</button>
				</div>
				<div class="card service-card">
					<h2 id="card-title">
						<img src="/imgs/grafana_logo.webp" alt="Grafana logo" class="service-logo"> GRAFANA
					</h2>
					<p class="service-description">Metrics visualization and monitoring dashboard platform.</p>
					<button id="grafana-button" class="service-button">Go to Grafana</button>
				</div>
			</main>"""