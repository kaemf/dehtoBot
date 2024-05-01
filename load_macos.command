#!/bin/bash

DIRECTORY="/Users/yaroslav/Documents/Work/DehtoProject/dehtoBot/macos_handlers"
osascript -e "tell application \"Terminal\" to do script \"cd '$DIRECTORY' && clear; echo 'Ready to use'\""
osascript -e "tell application \"Terminal\" to close second window"