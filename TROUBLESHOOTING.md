# Troubleshooting user_geo Field

## How to Verify user_geo is Working

### Step 1: Check Browser Console

1. Open your site in browser
2. Open Developer Tools (F12 or Cmd+Option+I)
3. Go to Console tab
4. Look for these messages:
   - `✓ User geo detected and set: [location]` - Success!
   - `⚠ WARNING: user_geo is missing from form data!` - Problem detected
   - `✓ user_geo is included in form data: [location]` - Good!

### Step 2: Test Form Submission

1. Fill out and submit the form
2. Check the console for:
   ```
   Form data: {
     ...
     user_geo: "Miami, FL"  // ← Should see this
     ...
   }
   ```

### Step 3: Check n8n Workflow

1. Go to your n8n workflow
2. Check the webhook node - verify it receives `user_geo` field
3. Check the Supabase node - verify it maps `user_geo` → `user_geo` column

### Step 4: Verify in Supabase

1. Go to Supabase Dashboard
2. Table Editor → `clients` table
3. Check a recent submission
4. Look for `user_geo` column - should have a value like "Miami, FL" or "New York, NY"

## Common Issues

### Issue 1: user_geo is empty in Supabase

**Possible causes:**
- n8n workflow not mapping `user_geo` field
- Column doesn't exist (run the SQL migration)
- Geo detection failed (check console for errors)

**Solution:**
1. Check browser console for geo detection errors
2. Verify n8n workflow maps `user_geo` → `user_geo`
3. Run the SQL migration if column is missing

### Issue 2: Geo detection not working

**Check:**
- Browser console for errors
- Network tab for failed API calls (ipapi.co)
- Timezone detection should work even if IP detection fails

**Solution:**
- Timezone detection should always work (no API needed)
- If IP detection fails, it falls back to timezone
- If both fail, it uses default from config ("Miami, FL")

### Issue 3: Field exists but value is null

**Check:**
- n8n workflow is receiving the field
- n8n workflow is mapping it correctly
- Supabase column allows NULL (it should)

## Testing Geo Detection

Open browser console and run:

```javascript
// Test geo detection
detectUserGeo().then(geo => {
  console.log('Detected geo:', geo);
  const field = document.getElementById('user_geo');
  console.log('Field value:', field ? field.value : 'Field not found');
}).catch(err => console.error('Error:', err));
```

## Expected Values

The `user_geo` field should contain values like:
- "Miami, FL"
- "New York, NY"
- "Los Angeles, CA"
- "Chicago, IL"
- Or just city name if state not available

## n8n Workflow Checklist

Make sure your n8n workflow:

1. ✅ Receives webhook data
2. ✅ Maps `user_geo` from webhook → `user_geo` in Supabase
3. ✅ Handles the field even if it's empty (should be optional)
4. ✅ Inserts into `clients` table

## Quick Test

1. Submit a test form
2. Check browser console - should see: `✓ user_geo is included in form data: [location]`
3. Check n8n execution log - should see `user_geo` in the data
4. Check Supabase - should see value in `user_geo` column
