-- Count public resource redirects without granting clients direct update access.
CREATE OR REPLACE FUNCTION public.increment_resource_click(resource_uuid UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.resources
  SET click_count = click_count + 1,
      updated_at = NOW()
  WHERE id = resource_uuid
    AND is_published = true;
$$;

REVOKE ALL ON FUNCTION public.increment_resource_click(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_resource_click(UUID) TO anon, authenticated;
