-- STEP 2: Update match_agents function for actual column names
CREATE OR REPLACE FUNCTION match_agents(
  query_embedding vector(384),
  desired_city text,
  required_specialties text[],
  preferred_language text,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  phone text,
  brokerage text,
  service_cities text[],
  specialties text[],
  languages text[],
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    a.id,
    a.name,
    a.email,
    a.phone,
    a.brokerage,
    a.service_cities,
    a.specialties,
    a.languages,
    1 - (a.embedding <=> query_embedding) AS similarity
  FROM agents a
  WHERE
    a.is_active = true
    AND a.embedding IS NOT NULL
    AND (
      a.service_cities @> ARRAY[desired_city]
      OR a.service_states @> ARRAY['FL']
    )
  ORDER BY a.embedding <=> query_embedding
  LIMIT match_count;
$$;
