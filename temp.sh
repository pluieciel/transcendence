curl -s -u "$ELASTIC_USERNAME:$ELASTIC_PASSWORD" -X PUT "$ELASTIC_HOST/_ilm/policy/$service-lifecycle-policy" \
  -H "Content-Type: application/json" -d "{
    "policy": {
      "phases": {
        "hot": {
          "actions": {
            "rollover": {
              "max_age": "30d",
              "max_primary_shard_size": "50gb"
            },
            "set_priority": {
              "priority": 100
            }
          },
          "min_age": "0ms"
        },
        "warm": {
          "min_age": "90d",
          "actions": {
            "set_priority": {
              "priority": 50
            }
          }
        },
        "cold": {
          "min_age": "180d",
          "actions": {
            "set_priority": {
              "priority": 0
            }
          }
        },
        "delete": {
          "min_age": "365d",
          "actions": {
            "wait_for_snapshot": {
              "policy": "$service-snapshot-policy"
            },
            "delete": {}
          }
        }
      }
    }
  }