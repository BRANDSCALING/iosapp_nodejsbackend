# 📊 BrandScaling Database Setup Guide

This guide explains how to set up the PostgreSQL database for the BrandScaling E-DNA Quiz backend.

---

## 📋 Prerequisites

1. **PostgreSQL client** (`psql`) installed on your machine
2. **Database access** to AWS Aurora PostgreSQL
3. **Your IP whitelisted** in the AWS Security Group

### Installing psql (if needed)

**macOS:**
```bash
brew install postgresql
```

**Ubuntu/Debian:**
```bash
sudo apt-get install postgresql-client
```

**Windows:**
Download from [PostgreSQL Downloads](https://www.postgresql.org/download/windows/)

---

## 🔧 Database Connection Details

```
Host:     database-2-brandscaling-ios-instance-1.cc1k8qu4cwi2.us-east-1.rds.amazonaws.com
Port:     5432
Database: postgres
User:     database_ios
Password: Letmein786!
```

---

## 🚀 Quick Setup (Automated)

The easiest way to set up the database is using the automated script:

```bash
# Navigate to project directory
cd brandscaling-nodejs-backend

# Make the script executable
chmod +x database/setup_database.sh

# Run the setup script
./database/setup_database.sh
```

The script will:
1. ✅ Test database connection
2. ✅ Create all 6 tables
3. ✅ Insert Layer 1 quiz data (8 questions, 16 options)
4. ✅ Insert layer intro content (7 layers)
5. ✅ Test triggers
6. ✅ Verify everything is correct

---

## 📝 Manual Setup

If you prefer to run the SQL files manually:

### Step 1: Test Connection

```bash
PGPASSWORD='Letmein786!' psql \
  -h database-2-brandscaling-ios-instance-1.cc1k8qu4cwi2.us-east-1.rds.amazonaws.com \
  -p 5432 \
  -U database_ios \
  -d postgres \
  -c "SELECT version();"
```

### Step 2: Create Tables

```bash
PGPASSWORD='Letmein786!' psql \
  -h database-2-brandscaling-ios-instance-1.cc1k8qu4cwi2.us-east-1.rds.amazonaws.com \
  -p 5432 \
  -U database_ios \
  -d postgres \
  -f database/001_create_tables.sql
```

### Step 3: Insert Layer 1 Quiz Data

```bash
PGPASSWORD='Letmein786!' psql \
  -h database-2-brandscaling-ios-instance-1.cc1k8qu4cwi2.us-east-1.rds.amazonaws.com \
  -p 5432 \
  -U database_ios \
  -d postgres \
  -f database/002_insert_layer1_quiz_data.sql
```

### Step 4: Insert Layer Intro Content

```bash
PGPASSWORD='Letmein786!' psql \
  -h database-2-brandscaling-ios-instance-1.cc1k8qu4cwi2.us-east-1.rds.amazonaws.com \
  -p 5432 \
  -U database_ios \
  -d postgres \
  -f database/003_insert_layer_intro.sql
```

---

## ✅ Verification

After setup, verify everything is correct:

### Check Tables Exist

```bash
PGPASSWORD='Letmein786!' psql \
  -h database-2-brandscaling-ios-instance-1.cc1k8qu4cwi2.us-east-1.rds.amazonaws.com \
  -p 5432 \
  -U database_ios \
  -d postgres \
  -c "\dt"
```

Expected output:
```
              List of relations
 Schema |        Name          | Type  |    Owner    
--------+----------------------+-------+-------------
 public | layer_intro_content  | table | database_ios
 public | quiz_options         | table | database_ios
 public | quiz_questions       | table | database_ios
 public | quiz_sessions        | table | database_ios
 public | user_quiz_progress   | table | database_ios
 public | user_quiz_results    | table | database_ios
```

### Check Row Counts

```bash
PGPASSWORD='Letmein786!' psql \
  -h database-2-brandscaling-ios-instance-1.cc1k8qu4cwi2.us-east-1.rds.amazonaws.com \
  -p 5432 \
  -U database_ios \
  -d postgres \
  -c "
SELECT 'quiz_questions' as table_name, COUNT(*) as rows FROM quiz_questions
UNION ALL SELECT 'quiz_options', COUNT(*) FROM quiz_options
UNION ALL SELECT 'layer_intro_content', COUNT(*) FROM layer_intro_content
ORDER BY table_name;"
```

Expected output:
```
     table_name      | rows
---------------------+------
 layer_intro_content |    7
 quiz_options        |   16
 quiz_questions      |    8
```

### Test API Endpoint

```bash
# Start the server
npm start

# Test questions endpoint
curl 'http://localhost:3000/api/v1/quiz/questions?layer=1'
```

---

## 🗃️ Database Schema

### Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `quiz_questions` | Quiz questions (all layers) | id, layer_number, question_text |
| `quiz_options` | Answer options for each question | id, question_id, option_text, score_type |
| `quiz_sessions` | User quiz sessions | id, user_id, started_at, is_completed |
| `user_quiz_progress` | Individual answer tracking | id, session_id, question_id, selected_option_id |
| `user_quiz_results` | Final quiz results | id, user_id, layer1_core_type, retake_available_at |
| `layer_intro_content` | Introduction text for each layer | id, layer_number, title, content |

### Key Relationships

```
quiz_questions (1) ─────< (N) quiz_options
quiz_sessions (1) ─────< (N) user_quiz_progress
quiz_sessions (1) ─────< (N) user_quiz_results
quiz_questions (1) ─────< (N) user_quiz_progress
quiz_options (1) ─────< (N) user_quiz_progress
```

### Triggers

1. **update_*_updated_at** - Auto-updates `updated_at` column on all tables
2. **calculate_retake_date** - Auto-calculates `retake_available_at` = `completed_at` + 7 days

---

## 🔧 Troubleshooting

### Cannot Connect to Database

**Error:** `connection refused` or `timeout`

**Solutions:**
1. Check your IP is whitelisted in AWS Security Group
2. Verify database credentials are correct
3. Ensure the database instance is running

To whitelist your IP:
1. Go to AWS Console → RDS → Databases
2. Click on your database instance
3. Go to Security Groups
4. Add inbound rule for PostgreSQL (port 5432) with your IP

### Permission Denied

**Error:** `permission denied for table`

**Solution:** Ensure you're using the correct database user with proper permissions.

### Table Already Exists

**Error:** `relation already exists`

**Solution:** The SQL script includes `DROP TABLE IF EXISTS` commands, but if you encounter issues, manually drop the tables first:

```sql
DROP TABLE IF EXISTS user_quiz_results CASCADE;
DROP TABLE IF EXISTS user_quiz_progress CASCADE;
DROP TABLE IF EXISTS quiz_sessions CASCADE;
DROP TABLE IF EXISTS quiz_options CASCADE;
DROP TABLE IF EXISTS quiz_questions CASCADE;
DROP TABLE IF EXISTS layer_intro_content CASCADE;
```

---

## 📁 File Structure

```
database/
├── 001_create_tables.sql          # Creates 6 tables + indexes + triggers
├── 002_insert_layer1_quiz_data.sql # Inserts 8 questions + 16 options
├── 003_insert_layer_intro.sql     # Inserts 7 layer intro contents
└── setup_database.sh              # Automated setup script
```

---

## 🔒 Security Notes

⚠️ **Important:** The `.env` file contains sensitive credentials. Never commit it to version control!

For production:
1. Use environment variables instead of hardcoded credentials
2. Use IAM database authentication
3. Enable SSL for database connections
4. Rotate passwords regularly
5. Use least-privilege database users

---

## 📚 Next Steps

After database setup:

1. **Start the API server:**
   ```bash
   npm start
   ```

2. **Test the health endpoint:**
   ```bash
   curl http://localhost:3000/health
   ```

3. **Get Layer 1 questions:**
   ```bash
   curl 'http://localhost:3000/api/v1/quiz/questions?layer=1'
   ```

4. **Continue adding quiz data for Layers 2-7** (future task)

---

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Verify your network can reach AWS
3. Ensure all environment variables are set correctly



