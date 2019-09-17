#!/bin/bash
# Script to bulk upload data in JSON format

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

RESTORE_TYPE=$1
FILE_PATH=$2

case "$RESTORE_TYPE" in
"players"|"games"|"predictions")
  ;;
*)
  show_usage && exit 1
  ;;
esac

if [ ! -f "$FILE_PATH" ]; then
  echo "File not found"
  show_usage
  exit 1
fi

for row in $(jq -r '.[] | @base64' < "$FILE_PATH"); do
  ITEM=$(echo "$row" | base64 --decode)
  curl --silent --user "$USERNAME":"$PASSWORD" -X POST -H "Content-Type: application/json" -d "$ITEM" "$BASE_URL/api/$RESTORE_TYPE"
done
