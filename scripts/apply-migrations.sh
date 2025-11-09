#!/bin/bash

# Apply Database Migrations Script
# Applies all migrations to both local and remote D1 databases

set -e  # Exit on error

DB_NAME="ai-study-companion-db"
MIGRATIONS_DIR="./migrations"

echo "=== D1 Database Migration Tool ==="
echo ""

# Function to apply migrations
apply_migrations() {
  local env=$1
  local flag=$2

  echo "Applying migrations to $env database..."
  echo ""

  # Apply each migration file in order
  for migration in "$MIGRATIONS_DIR"/*.sql; do
    if [ -f "$migration" ]; then
      echo "Running: $(basename "$migration")"
      wrangler d1 execute "$DB_NAME" "$flag" --file="$migration"
      echo ""
    fi
  done

  echo "$env migrations complete!"
  echo ""
}

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "Error: Migrations directory not found at $MIGRATIONS_DIR"
  exit 1
fi

# Apply to local or remote based on argument
case "$1" in
  local)
    apply_migrations "LOCAL" "--local"
    ;;
  remote)
    read -p "Are you sure you want to apply migrations to REMOTE production database? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
      apply_migrations "REMOTE" "--remote"
    else
      echo "Migration cancelled."
      exit 0
    fi
    ;;
  both)
    apply_migrations "LOCAL" "--local"
    read -p "Apply to REMOTE production database as well? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
      apply_migrations "REMOTE" "--remote"
    fi
    ;;
  *)
    echo "Usage: $0 {local|remote|both}"
    echo ""
    echo "  local  - Apply migrations to local development database"
    echo "  remote - Apply migrations to remote production database"
    echo "  both   - Apply migrations to both databases"
    exit 1
    ;;
esac

echo "=== Migration Complete ==="
