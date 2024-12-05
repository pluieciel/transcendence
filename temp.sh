curl -s -u "$ELASTIC_USERNAME:$ELASTIC_PASSWORD" -X PUT "$ELASTIC_HOST/_index_template/django-template" \
  -H "Content-Type: application/json" -d "{
    \"version\": 1,
    \"priority\": 100,
    \"template\": {
      \"settings\": {
        \"number_of_shards\": 2,
        \"number_of_replicas\": 2,
        \"index.lifecycle.name\": \"django-lifecycle-policy\",
        \"index.lifecycle.rollover_alias\": \"django-logs\"
      },
      \"aliases\": {
        \"django-logs\": {
          \"is_write_index\": true
        }
      }
    },
    \"index_patterns\": [\"django-logs-*\"]
  }
