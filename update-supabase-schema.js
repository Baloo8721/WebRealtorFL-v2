#!/usr/bin/env node
/**
 * Update Supabase Schema - Add missing columns for new form fields
 * This script checks and adds any missing columns to the clients table
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Auto-load .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  const envFile = readFileSync(join(__dirname, '.env'), 'utf8');
  envFile.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
} catch (e) {
  // .env file not found
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dponfdhixuxriqqxbbri.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_KEY) {
  console.error('Error: SUPABASE_SERVICE_KEY not found in .env');
  process.exit(1);
}

// Function to execute SQL via Supabase REST API (using RPC if available)
async function executeSQL(sql) {
  try {
    // Try using Supabase REST API with SQL endpoint
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql })
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.log('RPC method not available, trying direct SQL...');
  }

  // Alternative: Use Supabase Management API or direct connection
  console.log('Note: Direct SQL execution requires Supabase dashboard or psql connection');
  console.log('SQL to execute:');
  console.log(sql);
  return null;
}

// Check if column exists
async function columnExists(tableName, columnName) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?limit=1`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        return columnName in data[0];
      }
    }
  } catch (e) {
    console.error('Error checking column:', e.message);
  }
  return false;
}

// Add column to table
async function addColumn(tableName, columnName, columnType, nullable = true) {
  const sql = `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${columnName} ${columnType}${nullable ? '' : ' NOT NULL'};`;

  console.log(`\nAdding column: ${columnName} (${columnType}) to ${tableName}...`);
  const result = await executeSQL(sql);

  if (result !== null) {
    console.log(`✓ Column ${columnName} added successfully`);
    return true;
  } else {
    console.log(`⚠ Please run this SQL in Supabase SQL Editor:`);
    console.log(sql);
    return false;
  }
}

// Main function
async function updateSchema() {
  console.log('Checking Supabase clients table structure...\n');

  // Check existing columns
  const existingColumns = {
    user_geo: await columnExists('clients', 'user_geo'),
    site_source: await columnExists('clients', 'site_source'),
    // Note: source_website exists, we may need to map site_source to it
  };

  console.log('Current columns status:');
  console.log('  user_geo:', existingColumns.user_geo ? '✓ EXISTS' : '✗ MISSING');
  console.log('  site_source:', existingColumns.site_source ? '✓ EXISTS' : '✗ MISSING (but source_website exists)');

  // Columns to add
  const columnsToAdd = [];

  if (!existingColumns.user_geo) {
    columnsToAdd.push({
      name: 'user_geo',
      type: 'TEXT',
      nullable: true,
      description: 'Geographic location where user submitted the form (auto-detected)'
    });
  }

  // Note: site_source maps to source_website, so we don't need a separate column
  // But we should check if n8n is mapping it correctly

  if (columnsToAdd.length > 0) {
    console.log('\n📝 Adding missing columns...\n');
    for (const col of columnsToAdd) {
      await addColumn('clients', col.name, col.type, col.nullable);
    }
  } else {
    console.log('\n✓ All required columns exist!');
  }

  // Generate SQL script for manual execution if needed
  console.log('\n' + '='.repeat(60));
  console.log('SQL Script for Supabase Dashboard (if needed):');
  console.log('='.repeat(60));

  if (!existingColumns.user_geo) {
    console.log(`
-- Add user_geo column for tracking submission location
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS user_geo TEXT;

-- Add comment
COMMENT ON COLUMN clients.user_geo IS 'Geographic location where user submitted the form (auto-detected via timezone/IP)';
`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Field Mapping Notes:');
  console.log('='.repeat(60));
  console.log(`
Form Field → Supabase Column Mapping:
- site_source → source_website (already exists)
- preferred_language → preferred_language (already exists, but stores language codes: "en", "es", etc.)
- user_geo → user_geo (NEW - needs to be added)
- budget_btc → budget_btc (already exists)
- monthly_payment → monthly_payment (already exists)
- monthly_sats → monthly_sats (already exists)
- currentLocation → current_city (already exists)
- desiredLocation → desired_city (already exists)
- clientType → client_types (already exists, array)
- propertyType → property_types (already exists, array)
- budget → budget_amount (already exists)
- timeline → timeline (already exists, array)
- specialty → agent_specialties (already exists, array)
- preapproval → mortgage_preapproval (already exists, boolean)
- preapprovalAmount → preapproval_amount (already exists)
- notes → additional_notes (already exists)
- referralSource → how_found (already exists, array)
`);
}

// Run the update
updateSchema().catch(console.error);
