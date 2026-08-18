-- Allow username login without the service role key.
CREATE OR REPLACE FUNCTION public.lookup_auth_email(p_username text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email
  FROM public.profiles
  WHERE username = lower(trim(p_username))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_auth_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_auth_email(text) TO anon, authenticated;
