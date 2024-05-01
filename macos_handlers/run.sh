#!/bin/bash

COMMAND="npx ts-node ../src/main.ts"
osascript -e "tell application \"Terminal\" to do script \"$COMMAND\" in front window"