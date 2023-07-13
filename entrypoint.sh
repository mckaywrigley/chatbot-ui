#!/bin/bash

echo "starting entrypoint"

bash ./env.sh

# Hand off to the CMD
# cf https://stackoverflow.com/questions/42857897/execute-a-script-before-cmd
exec "$@"