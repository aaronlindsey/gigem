#!/bin/bash
# Loads demo data into the app

chmod +x restore.sh

./restore.sh players players-demo.json
./restore.sh games games-demo.json
./restore.sh predictions predictions-demo.json
