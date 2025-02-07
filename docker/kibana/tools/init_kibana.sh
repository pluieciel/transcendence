#!/bin/sh

export ELASTICSEARCH_PASSWORD=$(cat $KIBANA_PASSWORD_FILE)
INIT_FLAG="/usr/share/kibana/.initialized"

if [ ! -f "$INIT_FLAG" ]; then
  ELASTIC_PASSWORD=$(cat $ELASTICSEARCH_PASSWORD_FILE)

  curl -s -u "$ELASTIC_USERNAME:$ELASTIC_PASSWORD" \
    -X POST "$ELASTIC_HOST/_security/user/kibana_system/_password" \
    -H "Content-Type: application/json" \
    -d "{
      \"password\": \"$ELASTICSEARCH_PASSWORD\"
    }"

  echo "xpack.security.encryptionKey: \"$(openssl rand -base64 32)\"" >> /usr/share/kibana/config/kibana.yml
  echo "xpack.encryptedSavedObjects.encryptionKey: \"$(openssl rand -base64 32)\"" >> /usr/share/kibana/config/kibana.yml
  echo "xpack.reporting.encryptionKey: \"$(openssl rand -base64 32)\"" >> /usr/share/kibana/config/kibana.yml

  nohup /usr/local/bin/setup_kibana.sh &

  touch "$INIT_FLAG"
fi

exec /usr/share/kibana/bin/kibana "$@"
