curl -s -u "elastic:123456" -X POST "http://localhost:5601/api/data_views/data_view" \
  -H "Content-Type: application/json" -H "kbn-xsrf: kibana" -d "{
    \"data_view\": {
      \"name\": \"django\",
      \"title\": \"django-logs-*\"
    }
  }"
