# 🚀 START HERE

## What You Need to Do

### 1. Copy Files to Your Project

Copy these 4 files into your `brandscaling-nodejs-backend` project root:

```
brandscaling-nodejs-backend/
├── PROMPT_1_DATABASE_SETUP.md
├── PROMPT_2_FIX_BACKEND.md
├── REFERENCE_DATABASE_SCHEMA.md
└── HOW_TO_USE_THESE_PROMPTS.md
```

---

### 2. Open Project in Cursor

```bash
cd /path/to/brandscaling-nodejs-backend
cursor .
```

---

### 3. Give Prompt to Cursor

**Open Cursor Chat (Cmd+L or Ctrl+L)**

**Type:**
```
@PROMPT_1_DATABASE_SETUP.md
```

**Press Enter**

---

### 4. Wait for Cursor

Cursor will create:
- `database/` folder with 4 files
- `DATABASE_SETUP_GUIDE.md`

**Time:** 2-3 minutes

---

### 5. Run Database Setup

```bash
chmod +x database/setup_database.sh
./database/setup_database.sh
```

**Expected:**
```
✅ Database connection successful!
✅ Tables created successfully!
✅ Layer 1 quiz data inserted!
```

---

### 6. Fix Backend Issues

**In Cursor Chat:**
```
@PROMPT_2_FIX_BACKEND.md
```

Cursor will fix SSL configuration.

---

### 7. Test Everything

```bash
# Start server
npm run dev

# Test (in new terminal)
curl http://localhost:3000/health
curl "http://localhost:3000/api/v1/quiz/questions?layer=1"
```

**Expected:** Both return 200 OK ✅

---

## That's It! 🎉

**Total time:** 10 minutes  
**Cursor does:** All the work  
**You do:** Copy files, run commands

---

## Need Help?

Read: `HOW_TO_USE_THESE_PROMPTS.md`
