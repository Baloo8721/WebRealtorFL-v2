import json
from fastapi import FastAPI, Request
app = FastAPI()

SUPABASE_URL = "https://dponfdhixuxriqqxbbri.supabase.co"
SUPABASE_KEY = service_key

@app.get("/")
async def root():
    return {"status": "ok"}

@app.post("/")
async def execute(req: Request):
    data = await req.json()
    sql = data.get("sql", "")
    if not sql.strip():
        return {"error": "No SQL"}
    import httpx
    async with httpx.AsyncClient() as client:
        headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
        resp = await client.post(f"{SUPABASE_URL}/sql", headers=headers, params={"sql": sql})
        return {"status": "success" if resp.status_code == 200 else "error", "data": resp.text[:500]}
