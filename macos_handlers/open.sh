#!/bin/bash

COMMAND="cd ../ && code . && cd macos_handlers"
osascript -e "tell application \"Terminal\" to do script \"$COMMAND\" in front window"