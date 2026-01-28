# 📖 How to Use These Cursor Prompts

## 🎯 What You Have

3 files to give to Cursor:

1. **PROMPT_1_DATABASE_SETUP.md** - Main prompt for database setup
2. **PROMPT_2_FIX_BACKEND.md** - Prompt to fix backend issues  
3. **REFERENCE_DATABASE_SCHEMA.md** - Reference for Cursor to use

---

## 🚀 Step-by-Step Instructions

### Step 1: Open Your Project in Cursor

```bash
cd /path/to/brandscaling-nodejs-backend
cursor .
```

---

### Step 2: Add Reference Files to Project

Copy these 3 files into your project root:
- `PROMPT_1_DATABASE_SETUP.md`
- `PROMPT_2_FIX_BACKEND.md`
- `REFERENCE_DATABASE_SCHEMA.md`

---

### Step 3: Use Prompt 1 - Database Setup

1. Open Cursor chat (Cmd+L or Ctrl+L)
2. Type: `@PROMPT_1_DATABASE_SETUP.md`
3. Press Enter

**Cursor will:**
- Read the prompt
- Create `database/` folder
- Create 3 SQL files
- Create setup script
- Create documentation

**Time:** 2-3 minutes

---

### Step 4: Use Prompt 2 - Fix Backend

1. Open Cursor chat
2. Type: `@PROMPT_2_FIX_BACKEND.md`
3. Press Enter

**Cursor will:**
- Fix SSL configuration in `database.js`
- Create troubleshooting guides
- Update `.env.example`

**Time:** 1 minute

---

### Step 5: Run Database Setup

After Cursor creates the files:

```bash
# Make script executable
chmod +x database/setup_database.sh

# Run setup
./database/setup_database.sh
```

**Expected output:**
```
✅ Database connection successful!
✅ Tables created successfully!
✅ Layer 1 quiz data inserted!
✅ Layer intro content inserted!
```

---

### Step 6: Test Backend

```bash
# Start server
npm run dev

# Test health check (in new terminal)
curl http://localhost:3000/health

# Test get questions
curl "http://localhost:3000/api/v1/quiz/questions?layer=1"
```

**Expected:** Both return 200 OK with data

---

## 💡 Tips

### If Cursor doesn't see the file:

Instead of `@filename`, copy-paste the entire prompt content into Cursor chat.

### If you want to see what Cursor will create:

Ask Cursor: "Show me what files you'll create before you create them"

### If something goes wrong:

1. Check Cursor's response for errors
2. Ask Cursor: "What went wrong? How do I fix it?"
3. Cursor will debug and fix

---

## 🎯 What Cursor Will Create

### From Prompt 1:
```
database/
├── 001_create_tables.sql
├── 002_insert_layer1_quiz_data.sql
├── 003_insert_layer_intro.sql
└── setup_database.sh

DATABASE_SETUP_GUIDE.md
```

### From Prompt 2:
```
FIX_PORT_CONFLICT.md
TROUBLESHOOTING.md

Updated files:
├── src/config/database.js
└── .env.example
```

---

## ✅ Success Checklist

After using both prompts:

- [ ] `database/` folder exists with 4 files
- [ ] `DATABASE_SETUP_GUIDE.md` exists
- [ ] `FIX_PORT_CONFLICT.md` exists
- [ ] `src/config/database.js` has SSL fix
- [ ] Run `./database/setup_database.sh` successfully
- [ ] Health check returns "healthy"
- [ ] Get questions returns 8 questions

---

## 🆘 Troubleshooting

### Cursor says "I can't find the file"

**Solution:** Copy-paste the prompt content directly into chat

### Cursor creates files in wrong location

**Solution:** Tell Cursor: "Create these files in the project root"

### Database setup fails

**Solution:** 
1. Check your IP is whitelisted in AWS
2. Run: `curl ifconfig.me` to get your IP
3. Add to AWS security group

### Port 3000 in use

**Solution:**
```bash
lsof -ti:3000 | xargs kill -9
```

---

## 📞 Need Help?

If Cursor gets confused:

1. **Clear context:** Start a new chat
2. **Be specific:** "Create database/001_create_tables.sql with the schema from REFERENCE_DATABASE_SCHEMA.md"
3. **One step at a time:** Ask Cursor to create one file at a time

---

## 🎉 That's It!

**Total time:** 10-15 minutes  
**Cursor does:** 95% of the work  
**You do:** Copy prompts, run script, test

**Easy! 🚀**
