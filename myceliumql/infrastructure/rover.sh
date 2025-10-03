#!/bin/bash
# MyceliumQL Schema Composition Script
# Composes federated schema for restaurant/wine platform

set -e

echo "🚀 MyceliumQL Schema Composition Starting..."

# Install Rover if not present
if ! command -v rover &> /dev/null; then
    echo "📦 Installing Apollo Rover CLI..."
    curl -sSL https://rover.apollo.dev/nix/latest | sh
    export PATH=$PATH:$HOME/.rover/bin
fi

# Navigate to project root
cd "$(dirname "$0")/.."

# Compose the supergraph
echo "🔧 Composing supergraph schema..."
rover supergraph compose \
  --config ./infrastructure/supergraph-config.yaml \
  --output ./supergraph.graphql

# Validate composition
if [ $? -eq 0 ]; then
    echo "✅ Supergraph composed successfully!"
    echo "📄 Schema written to: ./supergraph.graphql"
    
    # In production, publish to Apollo Studio
    if [ "$NODE_ENV" = "production" ]; then
        echo "🚀 Publishing to Apollo Studio..."
        rover subgraph publish mycelium-restaurant-platform@current \
          --schema ./supergraph.graphql \
          --routing-url https://api.myceliumql.com/graphql
    fi
else
    echo "❌ Supergraph composition failed"
    echo "🔍 Check individual cartridge schemas for errors"
    exit 1
fi

echo "🎉 Schema composition complete!"