#!/bin/bash

ELASTIC_PASSWORD=$(cat $ELASTIC_PASSWORD_FILE)

retries=10
while [ $retries -gt 0 ]; do
  response=$(curl -s -X GET "http://localhost:5601/api/status" | grep -o '"level":"[^"]*"' | awk -F ':"' '{print $2}' | tr -d '"')
  
  if [ "$response" = "available" ]; then
    indexes=$(curl -s -u "$ELASTIC_USERNAME:$ELASTIC_PASSWORD" -X GET "$ELASTIC_HOST/_cat/indices/*-logs-*?h=index")
    echo $indexes

    while read -r index; do
      if [[ $index =~ ^([^-]+)-logs-.*$ ]]; then
        service=${BASH_REMATCH[1]}
        curl -s -u "$ELASTIC_USERNAME:$ELASTIC_PASSWORD" -X PUT "$ELASTIC_HOST/_snapshot/$service-repo" \
          -H "Content-Type: application/json" -d "{
            \"type\": \"fs\",
            \"settings\": {
              \"location\": \"$service-repo\"
            }
          }"
        curl -s -u "$ELASTIC_USERNAME:$ELASTIC_PASSWORD" -X PUT "$ELASTIC_HOST/_slm/policy/$service-snapshot-policy" \
          -H "Content-Type: application/json" -d "{
            \"name\": \"$service-snapshot-{now/d}\",
            \"schedule\": \"0 30 1 * * ?\",
            \"repository\": \"$service-repo\",
            \"config\": {
              \"include_global_state\": true,
              \"feature_states\": []
            },
            \"retention\": {
              \"expire_after\": \"365d\"
            }
          }"
      fi
    done <<< "$indexes"
    exit 0;
  else
    sleep 5
    retries=$((retries - 1))
  fi
done

exit 1;