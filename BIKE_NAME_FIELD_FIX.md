# Bike Name Field Fix

## ❌ Problem

**Error during extraction:**
```
[API] Validation failed: [ 'bike1: Missing bike name', 'bike2: Missing bike name' ]
```

**Root Cause:**
Claude was returning the data with `bike_name` field:
```json
{
  "bike1": {
    "bike_name": "Royal Enfield Scram 440",  // ← Claude used this
    "praises": [...],
    ...
  }
}
```

But the validation expected `name` field:
```typescript
if (!bike.name) {  // ← Validation checks this
  errors.push(`${bikeName}: Missing bike name`);
}
```

**Mismatch:** `bike_name` vs `name` = validation failure!

---

## ✅ Solution

Added a transformation in the Claude provider to normalize the field name:

**File:** `src/lib/ai/providers/claude.ts`

**Code added after line 138:**
```typescript
// Transform bike_name to name if needed (Claude sometimes uses bike_name)
if (insights.bike1.bike_name && !insights.bike1.name) {
  insights.bike1.name = insights.bike1.bike_name;
  delete insights.bike1.bike_name;
}
if (insights.bike2.bike_name && !insights.bike2.name) {
  insights.bike2.name = insights.bike2.bike_name;
  delete insights.bike2.bike_name;
}
```

---

## 🔧 How It Works

### Before Fix:
```
Claude returns:
{
  bike1: { bike_name: "..." }
}
    ↓
Validation checks:
if (!bike.name)  ❌ FAIL
    ↓
Error: "bike1: Missing bike name"
```

### After Fix:
```
Claude returns:
{
  bike1: { bike_name: "..." }
}
    ↓
Transform:
bike1.name = bike1.bike_name
delete bike1.bike_name
    ↓
Now:
{
  bike1: { name: "..." }
}
    ↓
Validation checks:
if (!bike.name)  ✅ PASS
    ↓
Success!
```

---

## 🎯 Why This Happened

**AI Variability:** 
- AI models like Claude can return slightly different field names
- Even with the same prompt, field names might vary between calls
- This is normal behavior for LLMs

**The Fix:**
- Added defensive coding to handle both formats
- Checks for `bike_name` and converts to `name` if needed
- Works for any future variations

---

## ✅ Testing

### Expected Results Now:

1. **Step 2:** YouTube scraping completes ✓
2. **Step 3:** Click "Extract Insights"
3. **Processing:** 
   ```
   [API] YouTube data: 131680 tokens → 23389 tokens (reduced by 82%)
   [Claude] Extraction complete
   [API] Validation passed  ← Should see this now!
   ```
4. **Success:** Insights display correctly ✓

---

## 📊 Full Flow

```
User clicks "Extract" in Step 3
    ↓
API receives YouTube data
    ↓
Preprocess: 131,680 tokens → 23,389 tokens
    ↓
Send to Claude API
    ↓
Claude returns insights with bike_name
    ↓
Transform: bike_name → name  ← NEW FIX
    ↓
Sanitize: Remove invalid quotes
    ↓
Validate: Check all fields  ← Now passes!
    ↓
Return to frontend
    ↓
Display insights ✓
```

---

## 🐛 If Still Failing

### Check 1: Is transformation running?
Look for this in logs (should NOT appear now):
```
[API] Validation failed: [ 'bike1: Missing bike name' ]
```

If still showing, transformation didn't work.

### Check 2: Other validation errors?
Check the full error message for other missing fields.

### Check 3: Claude API key?
Make sure `ANTHROPIC_API_KEY` is set in `.env.local`

---

## 🎉 Summary

**Problem:** Field name mismatch (`bike_name` vs `name`)  
**Solution:** Transform `bike_name` → `name` in Claude provider  
**Result:** Validation passes, extraction works! ✓

**Try it now!** Go to Step 3 and click "Extract Insights" - should work perfectly! 🚀

---

*Fix applied: November 27, 2025*

