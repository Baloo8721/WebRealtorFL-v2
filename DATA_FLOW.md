# Data Flow & Supabase Table Structure

## Form Data Flow

**Flow:** Website Form → n8n Webhook → Supabase Database

### All Form Fields Being Sent

#### **User Information (Visible Fields)**
- `name` - User's name
- `email` - User's email address
- `phone` - User's phone number (optional)
- `currentLocation` - Where they're moving from
- `desiredLocation` - Where they want to move to
- `clientType` - Buyer, Seller, Investor, or Renter (can be multiple)
- `propertyType` - Property type (can be multiple)
- `budget` - Budget/price range in USD
- `timeline` - When they want to move (Immediate, 1-3 Months, etc.)
- `specialty` - Agent specialties needed (can be multiple checkboxes)
- `preapproval` - Mortgage preapproval status (No, Yes, Explore Financing)
- `preapprovalAmount` - Preapproval amount (if applicable)
- `notes` - Additional notes or requirements
- `referralSource` - How they found the site

#### **Analytics & Tracking (Hidden Fields - Auto-populated)**
- `site_source` - Source website identifier (e.g., "florida-realtor")
- `preferred_language` - Language user selected (en, es, zh, ar, etc.)
- `user_geo` - **User's location where they submitted the form** (auto-detected via timezone/IP)
- `budget_btc` - Budget in Bitcoin equivalent
- `monthly_payment` - Calculated monthly payment estimate
- `monthly_sats` - Monthly payment in Satoshis
- `need_to_sell_before_buying` - Boolean (if client type is Buyer)
- `need_to_buy_after_selling` - Boolean (if client type is Seller)
- `need_to_sell_before_renting` - Boolean (if client type is Renter)

## Supabase Tables

Based on your setup, you have these tables:
- `clients` - Main client/lead information
- `referrals` - Referral tracking
- `agents` - Agent information
- `email_logs` - Email communication logs
- `documents` - Document storage
- `n8n_chat_histories` - Chatbot conversation history

## Where Data Goes

### Primary Table: `clients`

All form data is sent to your **n8n webhook**, which then processes and inserts it into Supabase. The data likely goes into the **`clients`** table with fields like:

**Standard Client Fields:**
- `name`
- `email`
- `phone`
- `current_location` (from `currentLocation` field)
- `desired_location` (from `desiredLocation` field)
- `client_type` (from `clientType` - may be array if multiple)
- `property_type` (from `propertyType` - may be array if multiple)
- `budget`
- `timeline`
- `specialties` (array of selected specialties)
- `preapproval`
- `preapproval_amount`
- `notes`
- `referral_source`

**Analytics Fields (Important for tracking):**
- `site_source` - Which site/region this came from
- `preferred_language` - Language user was using
- `user_geo` - **Geographic location where form was submitted** (e.g., "Miami, FL", "New York, NY")
- `budget_btc` - Budget in Bitcoin
- `monthly_payment` - Calculated monthly payment
- `monthly_sats` - Monthly payment in Satoshis
- `created_at` - Timestamp (auto-generated)

## Location Data Explained

You get **TWO types of location data**:

1. **`currentLocation`** & **`desiredLocation`** - Where user manually enters they're moving from/to
2. **`user_geo`** - **Where the user actually is** when submitting the form (auto-detected, no permission needed)

This helps you:
- Track which geographic areas are generating leads
- Understand if users are submitting from different locations than their target
- Analyze marketing effectiveness by region
- See if international users are interested in Florida properties

## n8n Workflow Setup

Your n8n workflow should:
1. Receive form data from webhook
2. Process/transform data if needed
3. Insert into Supabase `clients` table
4. Optionally send notification emails
5. Return success response

## Viewing Your Data

To view the data in Supabase:
1. Go to your Supabase dashboard
2. Navigate to Table Editor
3. Select the `clients` table
4. You'll see all submissions with all fields including:
   - User information
   - Location preferences
   - Analytics data (user_geo, site_source, preferred_language)
   - Crypto calculations (budget_btc, monthly_sats)

## Example Data Row

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "current_location": "New York, NY",
  "desired_location": "Miami, FL",
  "client_type": ["Buyer"],
  "property_type": ["Single-family"],
  "budget": 500000,
  "timeline": "3-6 Months",
  "specialties": ["Crypto", "Luxury"],
  "preapproval": "Yes",
  "preapproval_amount": 450000,
  "notes": "Looking for waterfront property",
  "referral_source": "Website",
  "site_source": "florida-realtor",
  "preferred_language": "en",
  "user_geo": "New York, NY",  // ← Auto-detected location
  "budget_btc": "0.0125",
  "monthly_payment": 3500,
  "monthly_sats": "1250000",
  "created_at": "2025-01-10T12:00:00Z"
}
```
