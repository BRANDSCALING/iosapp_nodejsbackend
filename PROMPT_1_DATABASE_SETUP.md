# 🎯 Cursor Prompt: Database Setup

## Context

I have a BrandScaling E-DNA Quiz backend (Node.js + Express + PostgreSQL). The database exists but has **NO TABLES YET**. I need you to create SQL scripts to set up the database.

---

## Your Task

Create SQL scripts in a `database/` folder to:

1. **Create 6 tables** with proper relationships
2. **Insert Layer 1 quiz data** (8 questions, 16 options)
3. **Insert layer intro content** (7 layers)
4. **Create an automated setup script**

---

## Database Connection Info

```
Host: database-2-brandscaling-ios-instance-1.cc1k8qu4cwi2.us-east-1.rds.amazonaws.com
Port: 5432
Database: postgres
User: database_ios
Password: Letmein786!
```

---

## Tables to Create

### 1. quiz_questions
- `id` SERIAL PRIMARY KEY
- `layer_number` INTEGER (1-7)
- `question_number` VARCHAR(10)
- `question_text` TEXT
- `question_type` VARCHAR(50)
- `weight` INTEGER DEFAULT 1
- `created_at`, `updated_at` TIMESTAMP

**Index:** layer_number

### 2. quiz_options
- `id` SERIAL PRIMARY KEY
- `question_id` INTEGER → quiz_questions(id)
- `option_key` VARCHAR(10)
- `option_text` TEXT
- `option_description` TEXT
- `score_type` VARCHAR(50)
- `created_at`, `updated_at` TIMESTAMP

**Index:** question_id

### 3. quiz_sessions
- `id` SERIAL PRIMARY KEY
- `user_id` VARCHAR(255)
- `started_at` TIMESTAMP
- `completed_at` TIMESTAMP
- `is_completed` BOOLEAN DEFAULT FALSE
- `created_at`, `updated_at` TIMESTAMP

**Indexes:** user_id, is_completed

### 4. user_quiz_progress
- `id` SERIAL PRIMARY KEY
- `user_id` VARCHAR(255)
- `session_id` INTEGER → quiz_sessions(id)
- `question_id` INTEGER → quiz_questions(id)
- `selected_option_id` INTEGER → quiz_options(id)
- `layer_number` INTEGER (1-7)
- `answered_at` TIMESTAMP
- `created_at`, `updated_at` TIMESTAMP

**UNIQUE:** (session_id, question_id)  
**Indexes:** user_id, session_id, layer_number

### 5. user_quiz_results
- `id` SERIAL PRIMARY KEY
- `user_id` VARCHAR(255)
- `session_id` INTEGER → quiz_sessions(id)
- `layer1_core_type` VARCHAR(50)
- `layer1_strength` VARCHAR(50)
- `layer1_architect_score` INTEGER
- `layer1_alchemist_score` INTEGER
- `layer2_subtype` VARCHAR(100)
- `layer2_description` TEXT
- `layer3_result` JSONB
- `layer4_result` JSONB
- `layer5_result` JSONB
- `layer6_result` JSONB
- `layer7_result` JSONB
- `completed_at` TIMESTAMP
- `retake_available_at` TIMESTAMP
- `created_at`, `updated_at` TIMESTAMP

**Indexes:** user_id, session_id, completed_at

### 6. layer_intro_content
- `id` SERIAL PRIMARY KEY
- `layer_number` INTEGER UNIQUE (1-7)
- `title` VARCHAR(255)
- `description` TEXT
- `content` TEXT
- `created_at`, `updated_at` TIMESTAMP

---

## Layer 1 Quiz Data to Insert

### Question 1:
**Text:** "When I'm about to make an important decision, I usually:"
- **Option A:** "I begin by clarifying the facts, weighing pros and cons, and mapping out a logical plan." (architect)
- **Option B:** "I trust my gut feeling and let my intuition guide me toward what feels right." (alchemist)

### Question 2:
**Text:** "When I think about my brand or business, I feel most energized by:"
- **Option A:** "Building systems, structures, and strategies that deliver measurable results." (architect)
- **Option B:** "Exploring creative ideas, experimenting with new approaches, and inspiring transformation." (alchemist)

### Question 3:
**Text:** "If someone asked me to describe my approach to problem-solving, I'd say:"
- **Option A:** "I analyze the situation, break it down into steps, and apply proven methods." (architect)
- **Option B:** "I look for patterns, trust my instincts, and often find unconventional solutions." (alchemist)

### Question 4:
**Text:** "When I communicate with my audience or clients, I tend to:"
- **Option A:** "Focus on clarity, data, and actionable insights that help them succeed." (architect)
- **Option B:** "Share stories, emotions, and visions that inspire and connect on a deeper level." (alchemist)

### Question 5:
**Text:** "My ideal work environment is one where:"
- **Option A:** "There are clear goals, organized processes, and a structured path to success." (architect)
- **Option B:** "There is freedom to explore, experiment, and follow inspiration wherever it leads." (alchemist)

### Question 6:
**Text:** "When I look at successful brands or leaders, I'm most drawn to those who:"
- **Option A:** "Have built scalable systems, strong frameworks, and consistent results." (architect)
- **Option B:** "Have created movements, sparked innovation, and transformed industries." (alchemist)

### Question 7:
**Text:** "If I had to choose between these two strengths, I'd say I'm better at:"
- **Option A:** "Planning, organizing, and executing strategies with precision." (architect)
- **Option B:** "Imagining possibilities, connecting ideas, and inspiring others." (alchemist)

### Question 8:
**Text:** "When I think about the legacy I want to leave, I imagine:"
- **Option A:** "A well-built foundation, a reliable system, or a lasting structure that others can build upon." (architect)
- **Option B:** "A spark of transformation, a shift in perspective, or a movement that changes lives." (alchemist)

---

## Layer Intro Content to Insert

Create intro content for layers 1-7:

**Layer 1:** "Core Type - Discover your foundational brand DNA"  
**Layer 2:** "Subtype - Refine your unique brand personality"  
**Layer 3:** "Communication Style - How you connect and convey your message"  
**Layer 4:** "Decision-Making Process - Understanding how you choose and commit"  
**Layer 5:** "Value System - The principles that guide your brand"  
**Layer 6:** "Growth Pattern - How you evolve and scale your impact"  
**Layer 7:** "Legacy Vision - The lasting impact you want to create"

---

## Special Requirements

### Triggers to Create:

1. **Auto-update `updated_at`** on all tables
2. **Auto-calculate `retake_available_at`** = `completed_at` + 7 days

### Foreign Keys:
- ON DELETE CASCADE for all foreign keys

### Verification Queries:
Include queries to verify:
- All tables exist
- Row counts are correct
- Triggers work

---

## Files to Create

1. **database/001_create_tables.sql**
   - DROP existing tables (if exist)
   - CREATE all 6 tables
   - CREATE indexes
   - CREATE triggers
   - Include verification queries

2. **database/002_insert_layer1_quiz_data.sql**
   - INSERT 8 questions
   - INSERT 16 options (2 per question)
   - Include verification queries

3. **database/003_insert_layer_intro.sql**
   - INSERT 7 layer intro contents
   - Include verification queries

4. **database/setup_database.sh**
   - Bash script to run all 3 SQL files
   - Test connection first
   - Show progress
   - Verify setup
   - Use PGPASSWORD for automation

5. **DATABASE_SETUP_GUIDE.md**
   - How to run the setup
   - Manual and automated options
   - Troubleshooting
   - Verification steps

---

## Success Criteria

After running your scripts:
- ✅ 6 tables exist
- ✅ quiz_questions has 8 rows
- ✅ quiz_options has 16 rows
- ✅ layer_intro_content has 7 rows
- ✅ Triggers work (test by inserting data)
- ✅ Foreign keys enforce relationships

---

## Notes

- Use PostgreSQL syntax (not MySQL)
- Use single quotes for strings
- Escape single quotes with ''
- Use SERIAL for auto-increment
- Use JSONB for JSON data
- Use CASCADE for foreign keys

---

**Start by creating the database/ folder and the 5 files listed above.**
