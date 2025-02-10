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
					'message': 'Invalid token or User not found'
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
		return """<div id="services">
					<div id="services-container">
						<div class="service userOutline">
							<div class="service-header">
								<h3>Elasticsearch</h3>
								<img src="/imgs/elasticsearch_logo.webp" alt="Elasticsearch logo" class="service-logo">
							</div>
							<p class="service-description">Search and analytics engine for all application logs and metrics.</p>
							<button id="elasticsearchBtn">Go to Elasticsearch</button>
						</div>
						<div class="service userOutline">
							<div class="service-header">
								<h3>Kibana</h3>
								<img src="/imgs/kibana_logo.webp" alt="Kibana logo" class="service-logo">
							</div>
							<p class="service-description">Visualization dashboard for Elasticsearch data and log analysis.</p>
							<button id="kibanaBtn">Go to Kibana</button>
						</div>
						<div class="service userOutline">
							<div class="service-header">
								<h3>cAdvisor</h3>
								<img src="/imgs/cadvisor_logo.webp" alt="cAdvisor logo" class="service-logo">
							</div>
							<p class="service-description">Container resource usage and performance analyzer.</p>
							<button id="cadvisorBtn">Go to cAdvisor</button>
						</div>
						<div class="service userOutline">
							<div class="service-header">
								<h3>Node Exporter</h3>
							</div>
							<p class="service-description">Hardware and OS metrics exporter for system monitoring.</p>
							<button id="nodeExporterBtn">Go to Node Exporter</button>
						</div>
						<div class="service userOutline">
							<div class="service-header">
								<h3>Prometheus</h3>
								<img src="/imgs/prometheus_logo.webp" alt="Prometheus logo" class="service-logo">
							</div>
							<p class="service-description">Time series database for metrics collection and alerting.</p>
							<button id="prometheusBtn">Go to Prometheus</button>
						</div>
						<div class="service userOutline">
							<div class="service-header">
								<h3>Grafana</h3>
								<img src="/imgs/grafana_logo.webp" alt="Grafana logo" class="service-logo">
							</div>
							<p class="service-description">Metrics visualization and monitoring dashboard platform.</p>
							<button id="grafanaBtn">Go to Grafana</button>
						</div>
					</div>
				</div>"""