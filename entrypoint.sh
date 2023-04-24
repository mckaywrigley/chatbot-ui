#!/bin/ash
set -e

if ( [ "${STORAGE_TYPE}" = "couchdb" ] ); then
    if ( [ -z "${COUCHDB_USERNAME}" ] ); then
        export COUCHDB_USERNAME='admin'
    fi

    if ( [ -z "${COUCHDB_PASSWORD}" ] ); then
        export COUCHDB_PASSWORD='password'
    fi

    if ( [ -z "${COUCHDB_HOST}" ] ); then
        export COUCHDB_HOST='http://couchdb'
    fi

    if ( [ -z "${COUCHDB_PORT}" ] ); then
        export COUCHDB_PORT=5984
    fi

    if ( [ -z "${COUCHDB_DATABASE}" ] ); then
        export COUCHDB_DATABASE="chatbot"
    fi

    until $(curl -u ${COUCHDB_USERNAME}:${COUCHDB_PASSWORD} --output /dev/null --silent --head --fail "${COUCHDB_HOST}:${COUCHDB_PORT}"); do
        echo "Waiting for CouchDB server to start..."
        sleep 1
    done

    RESPONSE=$(curl -u ${COUCHDB_USERNAME}:${COUCHDB_PASSWORD} -s -I -X HEAD "${COUCHDB_HOST}:${COUCHDB_PORT}/${COUCHDB_DATABASE}")
    if [[ "$RESPONSE" == *"200 OK"* ]]; then
        echo "Database ${COUCHDB_DATABASE} exists..."
    else
        echo "Creating ${COUCHDB_DATABASE} database..."
        curl -u ${COUCHDB_USERNAME}:${COUCHDB_PASSWORD} -X PUT ${COUCHDB_HOST}:${COUCHDB_PORT}/${COUCHDB_DATABASE}
        curl -u ${COUCHDB_USERNAME}:${COUCHDB_PASSWORD} -X PUT ${COUCHDB_HOST}:${COUCHDB_PORT}/${COUCHDB_DATABASE}/folders -d '{"_id": "folders", "data": []}'
        curl -u ${COUCHDB_USERNAME}:${COUCHDB_PASSWORD} -X PUT ${COUCHDB_HOST}:${COUCHDB_PORT}/${COUCHDB_DATABASE}/prompts -d '{"_id": "prompts", "data": []}'
        curl -u ${COUCHDB_USERNAME}:${COUCHDB_PASSWORD} -X PUT ${COUCHDB_HOST}:${COUCHDB_PORT}/${COUCHDB_DATABASE}/conversations -d '{"_id": "conversations", "data": []}'
    fi

    echo "CouchDB is ready!"
fi

# Run command with node if the first argument contains a "-" or is not a system command. The last
# part inside the "{}" is a workaround for the following bug in ash/dash:
# https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=874264
if [ "${1#-}" != "${1}" ] || [ -z "$(command -v "${1}")" ] || { [ -f "${1}" ] && ! [ -x "${1}" ]; }; then
  set -- node "$@"
fi

exec "$@"
