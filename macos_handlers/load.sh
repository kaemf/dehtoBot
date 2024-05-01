#!/bin/bash

COMMAND="brew services start mongodb-community && redis-server"
osascript -e "tell application \"Terminal\" to do script \"$COMMAND\" in front window"