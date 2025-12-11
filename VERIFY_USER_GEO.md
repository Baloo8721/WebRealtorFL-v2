# How to Verify user_geo is Working

## Quick Verification Steps

### 1. Check Browser Console (Easiest)

1. Open your site: `https://baloo8721.github.io/WebRealtorFL-v2/`
2. Open Browser Developer Tools (F12 or Cmd+Option+I)
3. Go to **Console** tab
4. Look for this message when page loads:
   ```
   ✓ User geo detected and set: Miami, FL
   ```
   (or whatever location it detects)

5. Fill out and submit the form
6. Look for this in console:
   ```
   Form data: {
     ...
     user_geo: "Miami, FL"  ← Should see this!
     ...
   }
   ✓ user_geo is included in form data: Miami, FL
   ```

### 2. Check n8n Workflow

1. Go to your n8n workflow
2. Submit a test form
3. Check the webhook execution
4. Look at the data received - should see `user_geo` field
5. Check the Supabase node - verify it's mapping `user_geo` → `user_geo` column

### 3. Check Supabase

1. Go to Supabase Dashboard
2. Table Editor → `clients` table
3. Find your test submission
4. Check the `user_geo` column - should have a value like:
   - "Miami, FL"
   - "New York, NY"
   - "Los Angeles, CA"
   - etc.

## If user_geo is Empty

### Check 1: Is the column in Supabase?

Run this SQL in Supabase SQL Editor:
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'clients' 
  AND column_name = 'user_geo';
```

If no results, run:
```sql
ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_geo TEXT;
```

### Check 2: Is n8n mapping it?

In your n8n workflow:
- Webhook node should receive `user_geo`
- Supabase node should map: `user_geo` → `user_geo`

### Check 3: Is geo detection working?

Open browser console and run:
```javascript
window.detectUserGeo().then(geo => {
  console.log('Detected:', geo);
}).catch(err => console.error('Error:', err));
```

Should return something like: "Miami, FL" or "New York, NY"

## Expected Behavior

✅ **On Page Load:**
- Console shows: `✓ User geo detected and set: [location]`
- `user_geo` hidden field has a value

✅ **On Form Submit:**
- Console shows: `✓ user_geo is included in form data: [location]`
- Form data includes `user_geo` field

✅ **In Supabase:**
- `user_geo` column has a value like "Miami, FL"

## Troubleshooting

### Problem: Console shows "user_geo is empty"

**Solution:** Geo detection might be slow. The code now tries to detect it during form submission if it's empty.

### Problem: Field exists but value is null in Supabase

**Solution:** Check n8n workflow mapping. Make sure `user_geo` from webhook → `user_geo` in Supabase.

### Problem: No console messages

**Solution:** 
1. Check if `enableGeoDetection` is `true` in `config.js`
2. Check browser console for JavaScript errors
3. Make sure `config.js` is loaded

## Test It Now

1. Open your site
2. Open browser console
3. Submit a test form
4. Check console for: `✓ user_geo is included in form data: [location]`
5. Check Supabase for the value in `user_geo` column

If you see the console message but not the Supabase value, the issue is in your n8n workflow mapping.
