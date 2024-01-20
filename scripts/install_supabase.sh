#!/bin/bash

if ! command -v supabase &> /dev/null; then
    echo "Supabase CLI not found. Installing..."
    case $(uname -s) in
        Linux*)
            echo "Linux OS detected. Attempting to install Supabase..."
            curl -L https://github.com/supabase/cli/releases/download/v1.133.3/supabase_1.133.3_linux_amd64.deb -o supabase.deb
            sudo dpkg -i supabase.deb
            rm supabase.deb
            ;;
        Darwin*)
            echo "macOS detected. Attempting to install Supabase via Homebrew..."
            brew install supabase/tap/supabase
            ;;
        *)
            echo "Unsupported OS. Exiting."
            exit 1
            ;;
    esac
    if ! command -v supabase &> /dev/null; then
        echo "Installation failed. Please troubleshoot and install Supabase properly."
        exit 1
    else
        echo "Supabase installed successfully."
    fi
else
    echo "Supabase CLI is already installed."
fi
