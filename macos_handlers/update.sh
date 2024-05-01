#!/bin/bash

COMMAND="cd ../ && git pull && cd macos_handlers"
osascript -e "tell application \"Terminal\" to do script \"$COMMAND\" in front window"