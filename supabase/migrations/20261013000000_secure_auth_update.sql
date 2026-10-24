-- ==============================================================================
-- KofyOne — Secure Authentication System Update
-- Migration: 20261013000000_secure_auth_update.sql
-- ==============================================================================

-- 1. Ensure pgcrypto extension is available
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. Add username to public.profiles if not already present
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT;

-- Create unique case-insensitive index on username
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower
  ON public.profiles (LOWER(username))
  WHERE username IS NOT NULL;

-- 3. Dedicated private table for security questions and hashed answers
CREATE TABLE IF NOT EXISTS public.user_security_questions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  answer_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast user security lookup
CREATE INDEX IF NOT EXISTS idx_user_security_questions_user_id
  ON public.user_security_questions(user_id);

-- Enable RLS and lock down direct table access from client-side anon / authenticated
ALTER TABLE public.user_security_questions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_security_questions FROM anon, authenticated;

-- 4. Table to track verification attempts and enforce 2-failure 1-hour lockout
CREATE TABLE IF NOT EXISTS public.security_verification_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_identifier TEXT NOT NULL, -- normalized lower email or username
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sec_attempts_identifier_recent
  ON public.security_verification_attempts(account_identifier, created_at DESC);

ALTER TABLE public.security_verification_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.security_verification_attempts FROM anon, authenticated;

-- 5. Table for temporary, single-use password reset tokens
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_lookup
  ON public.password_reset_tokens(token, used, expires_at);

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.password_reset_tokens FROM anon, authenticated;

-- ==============================================================================
-- 6. Helper Security Definer Functions (Shielded execution)
-- ==============================================================================

-- Check if username is available
CREATE OR REPLACE FUNCTION public.check_username_available(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE LOWER(username) = LOWER(TRIM(p_username))
  );
$$;

REVOKE ALL ON FUNCTION public.check_username_available(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_username_available(TEXT) TO authenticated, anon;

-- Resolve email by identifier (email or username)
CREATE OR REPLACE FUNCTION public.get_email_by_identifier(p_identifier TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT email FROM auth.users WHERE LOWER(email) = LOWER(TRIM(p_identifier)) LIMIT 1),
    (SELECT email FROM public.profiles WHERE LOWER(username) = LOWER(TRIM(p_identifier)) LIMIT 1)
  );
$$;

REVOKE ALL ON FUNCTION public.get_email_by_identifier(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_email_by_identifier(TEXT) TO authenticated, anon;

-- Count failed verification attempts in the last 1 hour
CREATE OR REPLACE FUNCTION public.count_recent_failed_attempts(p_identifier TEXT)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COUNT(*)::INT
  FROM public.security_verification_attempts
  WHERE account_identifier = LOWER(TRIM(p_identifier))
    AND success = FALSE
    AND created_at > (NOW() - INTERVAL '1 hour');
$$;

REVOKE ALL ON FUNCTION public.count_recent_failed_attempts(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.count_recent_failed_attempts(TEXT) TO authenticated, anon;

-- Record a verification attempt
CREATE OR REPLACE FUNCTION public.record_verification_attempt(
  p_identifier TEXT,
  p_user_id UUID,
  p_success BOOLEAN,
  p_ip TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.security_verification_attempts (
    account_identifier,
    user_id,
    success,
    ip_address
  )
  VALUES (
    LOWER(TRIM(p_identifier)),
    p_user_id,
    p_success,
    p_ip
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_verification_attempt(TEXT, UUID, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_verification_attempt(TEXT, UUID, BOOLEAN, TEXT) TO authenticated, anon;

-- Register security question and username during registration
CREATE OR REPLACE FUNCTION public.register_user_security(
  p_user_id UUID,
  p_username TEXT,
  p_question_id TEXT,
  p_answer_hash TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Update username in profiles
  UPDATE public.profiles
  SET username = LOWER(TRIM(p_username)),
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Store question and hashed answer
  INSERT INTO public.user_security_questions (
    user_id,
    question_id,
    answer_hash,
    updated_at
  )
  VALUES (
    p_user_id,
    p_question_id,
    p_answer_hash,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET question_id = EXCLUDED.question_id,
      answer_hash = EXCLUDED.answer_hash,
      updated_at = NOW();
END;
$$;

REVOKE ALL ON FUNCTION public.register_user_security(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_user_security(UUID, TEXT, TEXT, TEXT) TO authenticated, anon;

-- Get security question and hash for verification
CREATE OR REPLACE FUNCTION public.get_security_question_for_verification(p_identifier TEXT)
RETURNS TABLE (
  out_user_id UUID,
  out_email TEXT,
  out_question_id TEXT,
  out_answer_hash TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT 
    u.id AS out_user_id,
    u.email AS out_email,
    sq.question_id AS out_question_id,
    sq.answer_hash AS out_answer_hash
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  INNER JOIN public.user_security_questions sq ON sq.user_id = u.id
  WHERE LOWER(u.email) = LOWER(TRIM(p_identifier))
     OR (p.username IS NOT NULL AND LOWER(p.username) = LOWER(TRIM(p_identifier)))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_security_question_for_verification(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_security_question_for_verification(TEXT) TO authenticated, anon;

-- Store single-use password reset token
CREATE OR REPLACE FUNCTION public.store_password_reset_token(
  p_user_id UUID,
  p_token TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Invalidate any existing unused tokens for this user
  UPDATE public.password_reset_tokens
  SET used = TRUE
  WHERE user_id = p_user_id AND used = FALSE;

  -- Insert new single-use token valid for 10 minutes
  INSERT INTO public.password_reset_tokens (
    user_id,
    token,
    expires_at
  )
  VALUES (
    p_user_id,
    p_token,
    NOW() + INTERVAL '10 minutes'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.store_password_reset_token(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.store_password_reset_token(UUID, TEXT) TO authenticated, anon;

-- Verify and consume password reset token
CREATE OR REPLACE FUNCTION public.apply_password_reset(
  p_token TEXT,
  p_new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Find valid unexpired token
  SELECT user_id INTO v_user_id
  FROM public.password_reset_tokens
  WHERE token = p_token
    AND used = FALSE
    AND expires_at > NOW()
  FOR UPDATE;

  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Mark token as used
  UPDATE public.password_reset_tokens
  SET used = TRUE
  WHERE token = p_token;

  -- Update password in auth.users using pgcrypto blowfish bcrypt
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
      updated_at = NOW()
  WHERE id = v_user_id;

  -- Clear failed verification attempts for this user
  DELETE FROM public.security_verification_attempts
  WHERE user_id = v_user_id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_password_reset(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_password_reset(TEXT, TEXT) TO authenticated, anon;
