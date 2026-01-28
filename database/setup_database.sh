#!/bin/bash

# ============================================
# BrandScaling E-DNA Quiz Database Setup Script
# ============================================
# This script automatically sets up the database by:
# 1. Testing the connection
# 2. Running all SQL migration files
# 3. Verifying the setup
# ============================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database connection details
DB_HOST="${DB_HOST:-database-2-brandscaling-ios-instance-1.cc1k8qu4cwi2.us-east-1.rds.amazonaws.com}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-postgres}"
DB_USER="${DB_USER:-database_ios}"
DB_PASSWORD="${DB_PASSWORD:-Letmein786!}"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ============================================
# Helper Functions
# ============================================

print_header() {
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}============================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to run SQL file
run_sql_file() {
    local file=$1
    local filename=$(basename "$file")
    
    echo ""
    print_info "Running: $filename"
    
    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -f "$file" \
        --quiet \
        --set ON_ERROR_STOP=1
    
    if [ $? -eq 0 ]; then
        print_success "$filename completed successfully"
        return 0
    else
        print_error "$filename failed!"
        return 1
    fi
}

# ============================================
# Main Script
# ============================================

print_header "BrandScaling Database Setup"

echo ""
echo "Database Configuration:"
echo "  Host:     $DB_HOST"
echo "  Port:     $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User:     $DB_USER"
echo ""

# Step 1: Test Connection
print_header "Step 1: Testing Database Connection"

PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -c "SELECT version();" \
    --quiet \
    --no-align \
    --tuples-only > /dev/null 2>&1

if [ $? -eq 0 ]; then
    print_success "Database connection successful!"
else
    print_error "Cannot connect to database!"
    echo ""
    echo "Please check:"
    echo "  1. Database credentials are correct"
    echo "  2. Your IP is whitelisted in AWS Security Group"
    echo "  3. Database instance is running"
    echo ""
    echo "You can also set environment variables:"
    echo "  export DB_HOST=your-host"
    echo "  export DB_PORT=5432"
    echo "  export DB_NAME=postgres"
    echo "  export DB_USER=your-user"
    echo "  export DB_PASSWORD=your-password"
    echo ""
    exit 1
fi

# Step 2: Run SQL Files
print_header "Step 2: Running SQL Migrations"

# Create tables
if ! run_sql_file "$SCRIPT_DIR/001_create_tables.sql"; then
    print_error "Setup failed at table creation!"
    exit 1
fi

# Insert Layer 1 quiz data
if ! run_sql_file "$SCRIPT_DIR/002_insert_layer1_quiz_data.sql"; then
    print_error "Setup failed at Layer 1 data insertion!"
    exit 1
fi

# Insert layer intro content
if ! run_sql_file "$SCRIPT_DIR/003_insert_layer_intro.sql"; then
    print_error "Setup failed at layer intro insertion!"
    exit 1
fi

# Step 3: Verify Setup
print_header "Step 3: Verifying Database Setup"

echo ""
print_info "Checking table counts..."

# Run verification query
PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --quiet \
    -c "
SELECT 
    'Tables' as check_type,
    (SELECT COUNT(*) FROM information_schema.tables 
     WHERE table_schema = 'public' 
     AND table_type = 'BASE TABLE'
     AND table_name IN ('quiz_questions', 'quiz_options', 'quiz_sessions', 
                        'user_quiz_progress', 'user_quiz_results', 'layer_intro_content')) as count,
    6 as expected;
"

PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --quiet \
    -c "
SELECT 'quiz_questions' as table_name, COUNT(*) as rows FROM quiz_questions
UNION ALL
SELECT 'quiz_options', COUNT(*) FROM quiz_options
UNION ALL
SELECT 'layer_intro_content', COUNT(*) FROM layer_intro_content
ORDER BY table_name;
"

# Test trigger by inserting and checking retake_available_at
print_header "Step 4: Testing Triggers"

print_info "Testing retake_available_at trigger..."

PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --quiet \
    -c "
-- Create test session
INSERT INTO quiz_sessions (user_id, started_at) 
VALUES ('test-trigger-user', NOW())
RETURNING id;
"

PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --quiet \
    -c "
-- Create test result and verify trigger
INSERT INTO user_quiz_results (
    user_id, 
    session_id, 
    layer1_core_type, 
    layer1_strength,
    layer1_architect_score,
    layer1_alchemist_score,
    completed_at
) VALUES (
    'test-trigger-user',
    (SELECT id FROM quiz_sessions WHERE user_id = 'test-trigger-user' ORDER BY id DESC LIMIT 1),
    'architect',
    'strong',
    6,
    2,
    NOW()
)
RETURNING 
    'Trigger Test' as test,
    completed_at,
    retake_available_at,
    CASE 
        WHEN retake_available_at = completed_at + INTERVAL '7 days' 
        THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END as trigger_status;
"

# Clean up test data
PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --quiet \
    -c "
DELETE FROM user_quiz_results WHERE user_id = 'test-trigger-user';
DELETE FROM quiz_sessions WHERE user_id = 'test-trigger-user';
"

print_success "Test data cleaned up"

# Final Summary
print_header "Setup Complete! 🎉"

echo ""
echo "Your database is now ready with:"
echo "  ✅ 6 tables created"
echo "  ✅ 8 Layer 1 questions"
echo "  ✅ 16 Layer 1 options"
echo "  ✅ 7 layer intro contents"
echo "  ✅ Auto-update triggers active"
echo "  ✅ 7-day retake trigger active"
echo ""
echo "Next steps:"
echo "  1. Start your Node.js server: npm start"
echo "  2. Test the API: curl http://localhost:3000/health"
echo "  3. Get questions: curl 'http://localhost:3000/api/v1/quiz/questions?layer=1'"
echo ""



