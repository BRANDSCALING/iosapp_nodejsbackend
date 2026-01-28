# 📊 Database Schema Reference

Use this as reference when creating SQL scripts.

---

## Table Relationships

```
quiz_questions (parent)
    ↓
quiz_options (child)

quiz_sessions (parent)
    ↓
user_quiz_progress (child)
    ↓
user_quiz_results (child)

layer_intro_content (standalone)
```

---

## Complete Schema

### quiz_questions
```sql
CREATE TABLE quiz_questions (
    id SERIAL PRIMARY KEY,
    layer_number INTEGER NOT NULL CHECK (layer_number BETWEEN 1 AND 7),
    question_number VARCHAR(10) NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50),
    weight INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quiz_questions_layer ON quiz_questions(layer_number);
```

### quiz_options
```sql
CREATE TABLE quiz_options (
    id SERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    option_key VARCHAR(10) NOT NULL,
    option_text TEXT NOT NULL,
    option_description TEXT,
    score_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quiz_options_question ON quiz_options(question_id);
```

### quiz_sessions
```sql
CREATE TABLE quiz_sessions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quiz_sessions_user ON quiz_sessions(user_id);
CREATE INDEX idx_quiz_sessions_completed ON quiz_sessions(is_completed);
```

### user_quiz_progress
```sql
CREATE TABLE user_quiz_progress (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    session_id INTEGER NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    selected_option_id INTEGER NOT NULL REFERENCES quiz_options(id) ON DELETE CASCADE,
    layer_number INTEGER NOT NULL CHECK (layer_number BETWEEN 1 AND 7),
    answered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, question_id)
);

CREATE INDEX idx_user_quiz_progress_user ON user_quiz_progress(user_id);
CREATE INDEX idx_user_quiz_progress_session ON user_quiz_progress(session_id);
CREATE INDEX idx_user_quiz_progress_layer ON user_quiz_progress(layer_number);
```

### user_quiz_results
```sql
CREATE TABLE user_quiz_results (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    session_id INTEGER NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    layer1_core_type VARCHAR(50) NOT NULL,
    layer1_strength VARCHAR(50) NOT NULL,
    layer1_architect_score INTEGER NOT NULL,
    layer1_alchemist_score INTEGER NOT NULL,
    layer2_subtype VARCHAR(100),
    layer2_description TEXT,
    layer3_result JSONB,
    layer4_result JSONB,
    layer5_result JSONB,
    layer6_result JSONB,
    layer7_result JSONB,
    completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retake_available_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_quiz_results_user ON user_quiz_results(user_id);
CREATE INDEX idx_user_quiz_results_session ON user_quiz_results(session_id);
CREATE INDEX idx_user_quiz_results_completed ON user_quiz_results(completed_at);
```

### layer_intro_content
```sql
CREATE TABLE layer_intro_content (
    id SERIAL PRIMARY KEY,
    layer_number INTEGER NOT NULL UNIQUE CHECK (layer_number BETWEEN 1 AND 7),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Triggers

### Auto-update updated_at
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER update_quiz_questions_updated_at 
BEFORE UPDATE ON quiz_questions 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Repeat for all other tables...
```

### Auto-calculate retake date
```sql
CREATE OR REPLACE FUNCTION set_retake_date()
RETURNS TRIGGER AS $$
BEGIN
    NEW.retake_available_at := NEW.completed_at + INTERVAL '7 days';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_retake_date
BEFORE INSERT ON user_quiz_results
FOR EACH ROW
EXECUTE FUNCTION set_retake_date();
```

---

## Sample Data Format

### Insert Question
```sql
INSERT INTO quiz_questions (layer_number, question_number, question_text, question_type, weight)
VALUES (1, 'Q1', 'Question text here', NULL, 1);
```

### Insert Option
```sql
INSERT INTO quiz_options (question_id, option_key, option_text, option_description, score_type)
VALUES (1, 'a', 'Option text', 'Description', 'architect');
```

### Insert Layer Intro
```sql
INSERT INTO layer_intro_content (layer_number, title, description, content)
VALUES (1, 'Layer 1: Core Type', 'Short description', 'Full content here');
```

---

Use this schema as reference when creating your SQL scripts.
