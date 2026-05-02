-- Add first-class admin role support.
-- Signup and self-service role changes should continue to allow only student/teacher.

ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT chk_users_role
  CHECK (role IN ('student', 'teacher', 'admin'));
