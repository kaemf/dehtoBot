#!/bin/bash

COMMAND="brew services stop mongodb-community"
osascript -e "tell application \"Terminal\" to do script \"$COMMAND\" in front window"