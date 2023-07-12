#!/bin/bash
# taken from https://github.com/sparanoid/env.sh/blob/master/env.sh
#
# env.sh - Dead-simple .env file reader and generator
# Tunghsiao Liu (t@sparanoid.com)
#
# Inspired by:
# - https://github.com/andrewmclagan/react-env
# - https://www.freecodecamp.org/news/7f9d42a91d70/
# - https://github.com/kunokdev/cra-runtime-environment-variables
#
# Features:
# - Designed to be used for Next.js app inside a Docker container (General
#   React app should also work)
# - Read env file and generate __env.js file for runtime client use
# - Merge current environment variables passing to it (Useful for Docker images)
# - No dependencies (More like a lite version of react-env). This is important
#   to keep our container image as small as possible.
#
# Usage:
# - General usage:
#   $ ./env.sh
#
# - Replacing variable:
#   $ NEXT_PUBLIC_API_BASE=xxx ./env.sh
#
# - Enviroment variable not in whitelist will be discarded:
#   $ BAD_ENV=zzz ./env.sh
#
# - Change script options:
#   $ ENVSH_ENV="./.env.staging" ENVSH_OUTPUT="./public/config.js" ./env.sh
#
# - Use it inside Dockerfile:
#   RUN chmod +x ./env.sh
#   ENTRYPOINT ["./env.sh"]
#
# Debug:
# NEXT_PUBLIC_OB_ENV=123_from_fish NEXT_BAD_ENV=zzz NEXT_PUBLIC_OB_TESTNEW=testenv NEXT_PUBLIC_CODE_UPLOAD_SIZE_LIMIT=6666 ./env.sh

echo -e "env.sh loaded\n"

# Config
ENVSH_ENV="${ENVSH_ENV:-"./.env"}"
ENVSH_PREFIX="${ENVSH_PREFIX:-"NEXT_PUBLIC_"}"
ENVSH_PREFIX_STRIP="${ENVSH_PREFIX_STRIP:-true}"

# Can be `window.__env = {` or `const ENV = {` or whatever you want
ENVSH_PREPEND="${ENVSH_PREPEND:-"window.__env = {"}"
ENVSH_APPEND="${ENVSH_APPEND:-"}"}"
ENVSH_OUTPUT="${ENVSH_OUTPUT:-"./public/__env.js"}"

# Utils
__green() {
  printf '\033[1;31;32m%b\033[0m' "$1"
}

__yellow() {
  printf '\033[1;31;33m%b\033[0m' "$1"
}

__red() {
  printf '\033[1;31;40m%b\033[0m' "$1"
}

__info() {
  printf "%s\n" "$1"
}

__debug() {
  ENVSH_VERBOSE="${ENVSH_VERBOSE:-"false"}"
  if [ "$ENVSH_VERBOSE" == "true" ]; then
    printf "ENVSH_VERBOSE: %s\n" "$1"
  fi
}

ENVSH_SED="sed"
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "macOS detected, switching to gsed"

  if command -v gsed >/dev/null 2>&1 ; then
    __info "$(__green "Found"): $(gsed --version | head -n 1)"
  else
    __info "gsed not found, trying to install..."

    if command -v brew >/dev/null 2>&1 ; then
      __info "$(__green "Found"): $(brew --version | head -n 1)"
      brew install gnu-sed
    else
      __info "$(__red "Homebrew not found, install it first: https://brew.sh/")"
      exit 1;
    fi

  fi

  ENVSH_SED="gsed"
fi

# Recreate config file
rm -f "$ENVSH_OUTPUT"
touch "$ENVSH_OUTPUT"

# Create an array from inline variables
matched_envs=$(env | grep ${ENVSH_PREFIX})
IFS=$'\n' read -r -d '' -a matched_envs_arr <<< "$matched_envs"
echo -e "\nMatched inline env:\n"
for matched_env in "${matched_envs_arr[@]}"; do
  echo $matched_env
done

# Add assignment
echo "$ENVSH_PREPEND" >> "$ENVSH_OUTPUT"

# Check if file exists
[[ -f "$ENVSH_ENV" ]] || { echo "$ENVSH_ENV does not exist" ; exit 1 ;}

# Process .env for runtime client use
__info "$(__green "Parsing ${ENVSH_ENV}...\n")"
while IFS= read -r line
do
  # Check if this line is a valid environment variable and matches our prefix
  if printf '%s' "$line" | grep -e "=" | grep -e "$ENVSH_PREFIX"; then

    # Read and apply environment variable if exists
    # NOTE: <<< here operator not working with `sh`
    awk -F '=' '{print $1 ": \"" (ENVIRON[$1] ? ENVIRON[$1] : $2) "\","}' \
      <<< "$line" >> "$ENVSH_OUTPUT"
  fi
done < "$ENVSH_ENV"
echo "$ENVSH_APPEND" >> "$ENVSH_OUTPUT"

# Strip prefix if needed
$ENVSH_PREFIX_STRIP && $ENVSH_SED -i'' -e "s~$ENVSH_PREFIX~~g" "$ENVSH_OUTPUT"

# Update .env file itself
# NOTE: This step is not necessary because variables on pages inside the
# Next.js prod server won't be changed. They're already inlined during the
# build time.
for matched_env in "${matched_envs_arr[@]}"; do
  echo $matched_env
done

for i in "${!matched_envs_arr[@]}"; do
  IFS='=' read -ra key_arr <<< "${matched_envs_arr[$i]}"
  key=${key_arr[0]}

  if [[ "${matched_envs_arr[$i]}" = *"${key}"* ]]; then
    index="$i"
    echo -e "Got index from inline env: ${index}, replacing ${key}"
    find "$ENVSH_ENV" -type f -exec $ENVSH_SED -i'' \
      -e "s~$key=.*~${matched_envs_arr[$index]}~g" {} \;
  fi
done

# Print result
__debug "$(__green "\nDone! Final result in ${ENVSH_OUTPUT}:\n")"
__debug "`cat "$ENVSH_OUTPUT"`"

__debug "$(__green "\nDone! Modified ${ENVSH_ENV}:\n")"
__debug "`cat "$ENVSH_ENV"`"

__info "$(__green "\nenv.sh done\n")"