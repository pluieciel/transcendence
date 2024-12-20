#!/bin/bash

services=("elasticsearch" "logstash" "kibana" "nginx" "django" "postgres")

ELASTIC_PASSWORD=$(cat $ELASTICSEARCH_PASSWORD_FILE)

for service in "${services[@]}"; do
  curl -s -u "$ELASTIC_USERNAME:$ELASTIC_PASSWORD" \
   	-X PUT "$ELASTIC_HOST/_snapshot/$service-repo" \
    -H "Content-Type: application/json" \
    -d "{
      \"type\": \"fs\",
      \"settings\": {
        \"location\": \"$service-repo\"
      }
    }"

  curl -s -u "$ELASTIC_USERNAME:$ELASTIC_PASSWORD" \
   	-X PUT "$ELASTIC_HOST/_slm/policy/$service-snapshot-policy" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"<$service-snapshot-{now/d}>\",
      \"schedule\": \"0 30 1 * * ?\",
      \"repository\": \"$service-repo\",
      \"config\": {
        \"indices\": [\"$service-logs-*\"],
        \"include_global_state\": true,
        \"feature_states\": []
      },
      \"retention\": {
        \"expire_after\": \"365d\"
      }
    }"

  curl -s -u "$ELASTIC_USERNAME:$ELASTIC_PASSWORD" \
   	-X PUT "$ELASTIC_HOST/_ilm/policy/$service-lifecycle-policy" \
    -H "Content-Type: application/json" \
    -d "{
      \"policy\": {
        \"phases\": {
          \"hot\": {
            \"actions\": {
              \"rollover\": {
                \"max_age\": \"30d\",
                \"max_primary_shard_size\": \"50gb\"
              },
              \"set_priority\": {
                \"priority\": 100
              }
            },
            \"min_age\": \"0ms\"
          },
          \"warm\": {
            \"min_age\": \"90d\",
            \"actions\": {
              \"set_priority\": {
                \"priority\": 50
              }
            }
          },
          \"cold\": {
            \"min_age\": \"180d\",
            \"actions\": {
              \"set_priority\": {
                \"priority\": 0
              }
            }
          },
          \"delete\": {
            \"min_age\": \"365d\",
            \"actions\": {
              \"wait_for_snapshot\": {
                \"policy\": \"$service-snapshot-policy\"
              },
              \"delete\": {}
            }
          }
        }
      }
    }"

  curl -s -u "$ELASTIC_USERNAME:$ELASTIC_PASSWORD" \
   	-X PUT "$ELASTIC_HOST/_index_template/$service-template" \
    -H "Content-Type: application/json" \
    -d "{
      \"version\": 1,
      \"priority\": 100,
      \"template\": {
        \"settings\": {
          \"number_of_shards\": 2,
          \"number_of_replicas\": 2,
          \"index.lifecycle.name\": \"$service-lifecycle-policy\",
          \"index.lifecycle.rollover_alias\": \"$service-logs\"
        },
        \"aliases\": {
          \"$service-logs\": {
            \"is_write_index\": true
          }
        }
      },
      \"index_patterns\": [\"$service-logs-*\"]
    }"
done

retries=10
while [ $retries -gt 0 ]; do
  response=$(curl -s \
     			-X GET "$KIBANA_HOST/api/status" | grep -o '"level":"[^"]*"' | awk -F ':"' '{print $2}' | tr -d '"')

  if [ "$response" = "available" ]; then
    for service in "${services[@]}"; do
      curl -s -u "$ELASTIC_USERNAME:$ELASTIC_PASSWORD" \
       	-X POST "$KIBANA_HOST/api/data_views/data_view" \
        -H "Content-Type: application/json" \
        -H "kbn-xsrf: true" \
        -d "{
          \"data_view\": {
            \"name\": \"$service\",
            \"title\": \"$service-logs-*\"
          }
        }"
    done

    curl -s -u "$ELASTIC_USERNAME:$ELASTIC_PASSWORD" \
     	-X POST "$KIBANA_HOST/api/saved_objects/_import?createNewCopies=true" \
      	-H "kbn-xsrf: true" --form file=@./config/export.ndjson
    exit 0
  else
    sleep 5
    retries=$((retries - 1))
  fi
done

exit 1
