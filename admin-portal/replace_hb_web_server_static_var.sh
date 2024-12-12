#!/bin/bash

echo "Replacing static placeholders with environment variables"

cd /usr/share/nginx/html

echo 'Using environment variables:'
echo 'API_PORT: ' $API_PORT
echo 'WORKER_PORT: ' WORKER_PORT
echo 'API_SUBDOMAIN: ' $API_SUBDOMAIN
echo 'WORKER_SUBDOMAIN: ' WORKER_SUBDOMAIN
echo 'DOMAIN: ' $DOMAIN
echo 'API_PROTOCOL: ' $API_PROTOCOL
echo 'WEBSOCKET_SERVER_APP_ENDPOINT: ' $WEBSOCKET_SERVER_APP_ENDPOINT
echo 'WORKER_SERVER_SUBDOMIAN: ' $WORKER_SUBDOMAIN
echo 'DOCMANAGER_BASE_URL: ' $DOCMANAGER_BASE_URL
echo 'DOC_GDS_API_KEY: ' $DOC_GDS_API_KEY
echo 'DOC_AUTH_TOKEN: ' $DOC_AUTH_TOKEN

find . -type f -exec sed -i 's|STATICSET_VALUE_PLACEHOLDER_API_PORT|'"$API_PORT"'|g' {} \;
find . -type f -exec sed -i 's|STATICSET_VALUE_PLACEHOLDER_API_SUBDOMAIN|'"$API_SUBDOMAIN"'|g' {} \;
find . -type f -exec sed -i 's|STATICSET_VALUE_PLACEHOLDER_API_DOMAIN|'"$DOMAIN"'|g' {} \;
find . -type f -exec sed -i 's|STATICSET_VALUE_PLACEHOLDER_API_PROTOCOL|'"$API_PROTOCOL"'|g' {} \;
find . -type f -exec sed -i 's|STATICSET_VALUE_PLACEHOLDER_APP_ENDPOINT|'"$WEBSOCKET_SERVER_APP_ENDPOINT"'|g' {} \;
find . -type f -exec sed -i 's|STATICSET_VALUE_PLACEHOLDER_APP_WORKER_SUBDOMAIN|'"$WORKER_SUBDOMAIN"'|g' {} \;
find . -type f -exec sed -i 's|STATICSET_VALUE_PLACEHOLDER_DOCMANAGER_BASE_URL|'"$DOCMANAGER_BASE_URL"'|g' {} \;
find . -type f -exec sed -i 's|STATICSET_VALUE_PLACEHOLDER_DOC_GDS_API_KEY|'"$DOC_GDS_API_KEY"'|g' {} \;
find . -type f -exec sed -i 's|STATICSET_VALUE_PLACEHOLDER_DOC_AUTH_TOKEN|'"$DOC_AUTH_TOKEN"'|g' {} \;

echo "Replaced all placeholders. Exiting replace script.."
