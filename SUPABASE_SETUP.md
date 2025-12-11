# Supabase Table Setup Guide

## Current Status

✅ **Most columns already exist!** Your `clients` table is well-structured.

## Missing Column

❌ **`user_geo`** - This is the NEW column we added for tracking where users submit forms from.

## Quick Fix

### Option 1: Run SQL in Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Copy and paste this SQL:

```sql
-- Add user_geo column for tracking submission location
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS user_geo TEXT;

-- Add comment
COMMENT ON COLUMN clients.user_geo IS 'Geographic location where user submitted the form (auto-detected via timezone/IP)';
```

5. Click **Run**

### Option 2: Use the Migration File

Run the SQL from `supabase-migration.sql` file in your Supabase SQL Editor.

## Field Mapping (Form → Supabase)

Your n8n workflow needs to map form fields to Supabase columns:

| Form Field           | Supabase Column        | Status                  |
| -------------------- | ---------------------- | ----------------------- |
| `site_source`        | `source_website`       | ✅ Exists                |
| `preferred_language` | `preferred_language`   | ✅ Exists                |
| `user_geo`           | `user_geo`             | ⚠️ **NEEDS TO BE ADDED** |
| `budget_btc`         | `budget_btc`           | ✅ Exists                |
| `monthly_payment`    | `monthly_payment`      | ✅ Exists                |
| `monthly_sats`       | `monthly_sats`         | ✅ Exists                |
| `currentLocation`    | `current_city`         | ✅ Exists                |
| `desiredLocation`    | `desired_city`         | ✅ Exists                |
| `clientType`         | `client_types`         | ✅ Exists (array)        |
| `propertyType`       | `property_types`       | ✅ Exists (array)        |
| `budget`             | `budget_amount`        | ✅ Exists                |
| `timeline`           | `timeline`             | ✅ Exists (array)        |
| `specialty`          | `agent_specialties`    | ✅ Exists (array)        |
| `preapproval`        | `mortgage_preapproval` | ✅ Exists (boolean)      |
| `preapprovalAmount`  | `preapproval_amount`   | ✅ Exists                |
| `notes`              | `additional_notes`     | ✅ Exists                |
| `referralSource`     | `how_found`            | ✅ Exists (array)        |

## n8n Workflow Mapping

Make sure your n8n workflow maps:
- `site_source` → `source_website`
- `user_geo` → `user_geo` (after you add the column)
- All other fields as shown in the table above

## Verify Setup

After adding the column, you can verify it exists:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clients' 
  AND column_name = 'user_geo';
```

You should see:
```
| column_name | data_type |
| ----------- | --------- |
| user_geo    | text      |
```

## What Data You'll Get

Once set up, each form submission will include:

**User Information:**
- Name, email, phone
- Current location (where they're moving from)
- Desired location (where they want to move to)

**Analytics (Auto-captured):**
- `user_geo`: "Miami, FL" or "New York, NY" (where they submitted from)
- `source_website`: "florida-realtor" (which site they came from)
- `preferred_language`: "en", "es", "ar", etc. (language they used)

**Crypto Calculations:**
- `budget_btc`: Budget in Bitcoin
- `monthly_payment`: Calculated monthly payment
- `monthly_sats`: Monthly payment in Satoshis

All this data will be visible in your Supabase `clients` table! 🎉
