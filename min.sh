#!/bin/bash

# Create the minjs directory if it doesn't exist
mkdir -p minjs

# Function to minify JavaScript files
minify_js() {
  local source_file="$1"
  local target_file="minjs/${source_file/js\//}"

  # Create target directory if it doesn't exist
  mkdir -p "$(dirname "$target_file")"

  # Minify the JavaScript file
  uglifyjs "$source_file" -o "$target_file"

  # Replace references to js/ with minjs/
  sed -i 's/js\//minjs\//g' "$target_file"
}

# Find all JavaScript files in js/ and process them
export -f minify_js
find js/ -type f -name '*.js' -exec bash -c 'minify_js "$0"' {} \;
