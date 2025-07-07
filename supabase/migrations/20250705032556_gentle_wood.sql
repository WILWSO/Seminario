/*
  # Fix infinite recursion in users table RLS policies

  1. Security Function
    - Create `is_admin()` function with SECURITY DEFINER to bypass RLS
    - Grant execution to authenticated users

  2. Policy Updates
    - Drop existing admin policies that cause recursion
    - Recreate policies using the new `is_admin()` function
    - Update all other admin policies to use the function
*/

-- Create a SECURITY DEFINER function to check admin role (prevents infinite recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
  DECLARE
    user_role text;
  BEGIN
    SELECT role INTO user_role FROM public.users WHERE id = auth.uid();
    RETURN user_role = 'admin';
  END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can manage all enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;

-- Recreate policies using the new function
CREATE POLICY "Admins can read all users" ON users
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update all users" ON users
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can manage all courses" ON courses
  FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can manage all enrollments" ON enrollments
  FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can manage announcements" ON announcements
  FOR ALL USING (public.is_admin());