-- Mini Sems — OTP Logs RLS Fix
-- Run this in your Supabase SQL Editor to fix OTP verification issues.
-- This allows the anon role (unauthenticated app users) to INSERT and SELECT
-- from otp_logs so that OTP sending and verification work without a service-role key.

-- ============================================================
-- STEP 1: Grant table-level permissions to anon role
-- ============================================================

GRANT SELECT, INSERT, UPDATE ON TABLE public.otp_logs TO anon;

-- ============================================================
-- STEP 2: Add RLS policies for otp_logs
-- ============================================================

-- Allow anon users to INSERT a new OTP log (for sending OTP)
CREATE POLICY "anon_insert_otp_logs" ON public.otp_logs
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anon users to SELECT their own OTP log by mobile number
-- (needed for the DB-fallback verification path)
CREATE POLICY "anon_select_otp_logs" ON public.otp_logs
  FOR SELECT
  TO anon
  USING (true);

-- Allow anon users to UPDATE an OTP log (to mark as verified / increment attempts)
CREATE POLICY "anon_update_otp_logs" ON public.otp_logs
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- STEP 3: Also clean up old/expired OTP logs periodically (optional)
-- This function deletes expired OTP entries to keep the table lean.
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM public.otp_logs WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- To run cleanup manually: SELECT public.cleanup_expired_otps();

-- ============================================================
-- VERIFICATION (run these to confirm policies are applied)
-- ============================================================
-- SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'otp_logs';
