#!/bin/bash

function echoTask() {
  echo ''
  echo "> $@"
}

if ! npm run semantic-release pre ; then
  echo "Not publishing a new release."
  exit 0
fi

echoTask 'npm publish' &&
npm publish &&

echoTask 'npm run semantic-release post' &&
npm run semantic-release post &&

true
