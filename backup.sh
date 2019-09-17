#!/bin/bash
# Script to download all data in JSON format

USERNAME="admin"
PASSWORD="admin"
BASE_URL="http://localhost:8080"

function show_usage {
  echo "Usage: ./$SCRIPT_NAME [players|games|predictions] <file>"
}

SCRIPT_NAME=$(basename "$0")

if [ "$#" -ne 2 ]; then
  show_usage
  exit 1
fi

BACKUP_TYPE=$1
FILE_PATH=$2

case "$BACKUP_TYPE" in
"players"|"games"|"predictions")
  ;;
*)
  show_usage && exit 1
  ;;
esac

curl --silent --user "$USERNAME":"$PASSWORD" "$BASE_URL/api/$BACKUP_TYPE" > "$FILE_PATH"
