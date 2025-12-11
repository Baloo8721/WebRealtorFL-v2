# Security Guide

## Protected Files

The following files contain sensitive credentials and are excluded from git:

- `.env` - Environment variables with secrets
- `supabase-direct.js` - Contains Supabase service key
- `query-supabase.js` - Contains Supabase credentials
- `supabase-mcp-server.js` - Contains Supabase access token
- `supabase-mcp/` - MCP server with hardcoded fallback credentials
- `.cursor/mcp.json` - Cursor MCP configuration with credentials

## Setup Instructions

1. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```

2. **Fill in your credentials in `.env`:**
   - Get `SUPABASE_SERVICE_KEY` from: Supabase Dashboard > Project Settings > API > Service Role Key
   - Get `SUPABASE_ACCESS_TOKEN` from: Supabase Dashboard > Account Settings > Access Tokens

3. **For local scripts, use environment variables:**
   ```bash
   export SUPABASE_SERVICE_KEY="your_key_here"
   node supabase-direct.js list clients
   ```

## Before Pushing to GitHub

✅ **DO:**
- Commit `.env.example` (template file)
- Commit `.gitignore` (protects sensitive files)
- Commit code that uses `process.env.VARIABLE_NAME`

❌ **DON'T:**
- Commit `.env` file
- Commit files with hardcoded API keys
- Commit `.cursor/mcp.json` with credentials
- Commit `supabase-direct.js` or other files with secrets

## Verifying No Secrets in Git

Before pushing, check for secrets:
```bash
# Search for common secret patterns
git grep -i "sb_secret\|sbp_\|SUPABASE.*KEY" -- ':!node_modules' ':!.git'

# If any results, remove them before committing
```

## Rotating Credentials

If credentials are accidentally committed:
1. Rotate the keys in Supabase Dashboard immediately
2. Remove the commit from git history (if not yet pushed)
3. Update all `.env` files with new credentials
