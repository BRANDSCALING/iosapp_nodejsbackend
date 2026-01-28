#!/bin/bash

# ============================================
# Setup Agent Tables
# Run this script to create agent-related tables
# ============================================

echo "🚀 Setting up Agent tables..."

# Database connection details
DB_HOST="database-2-brandscaling-ios-instance-1.cc1k8qu4cwi2.us-east-1.rds.amazonaws.com"
DB_USER="database_ios"
DB_NAME="postgres"
DB_PASSWORD="Letmein786!"

# Run SQL files
echo ""
echo "📦 Creating agent_users table..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$(dirname "$0")/008_create_agent_users.sql"

if [ $? -eq 0 ]; then
  echo "✅ agent_users table created successfully"
else
  echo "❌ Failed to create agent_users table"
  exit 1
fi

echo ""
echo "📦 Creating agent_sessions and agent_messages tables..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$(dirname "$0")/009_create_agent_sessions.sql"

if [ $? -eq 0 ]; then
  echo "✅ agent_sessions and agent_messages tables created successfully"
else
  echo "❌ Failed to create agent_sessions/agent_messages tables"
  exit 1
fi

echo ""
echo "🎉 Agent tables setup complete!"
echo ""
echo "Tables created:"
echo "  - agent_users"
echo "  - agent_sessions"
echo "  - agent_messages"
echo ""
echo "Default agent account:"
echo "  Email: rubab@brandscaling.com"
echo "  Password: rubab-secure-password-2026"


