-- NUET simulator violations: enforce FK constraints and move details to JSONB.
-- Safe to re-run.

DO $$
DECLARE
    fk_name text;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'nuet_simulator_violations'
    ) AND EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'nuet_attempts'
    ) AND EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'users'
    ) THEN
        -- Remove orphaned rows before (re)adding FK constraints.
        DELETE FROM nuet_simulator_violations v
        WHERE NOT EXISTS (
            SELECT 1
            FROM nuet_attempts a
            WHERE a.id = v.attempt_id
        )
           OR NOT EXISTS (
            SELECT 1
            FROM users u
            WHERE u.id = v.user_id
        );

        -- Remove any pre-existing FK constraints on this table (including
        -- auto-generated names) so ON DELETE CASCADE is guaranteed.
        FOR fk_name IN
            SELECT c.conname
            FROM pg_constraint c
            JOIN pg_class t ON t.oid = c.conrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            WHERE n.nspname = 'public'
              AND t.relname = 'nuet_simulator_violations'
              AND c.contype = 'f'
        LOOP
            EXECUTE format(
                'ALTER TABLE nuet_simulator_violations DROP CONSTRAINT IF EXISTS %I',
                fk_name
            );
        END LOOP;

        ALTER TABLE nuet_simulator_violations
            ADD CONSTRAINT nuet_simulator_violations_attempt_id_fkey
                FOREIGN KEY (attempt_id) REFERENCES nuet_attempts(id) ON DELETE CASCADE,
            ADD CONSTRAINT nuet_simulator_violations_user_id_fkey
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'nuet_simulator_violations'
          AND column_name = 'details'
          AND data_type <> 'jsonb'
    ) THEN
        ALTER TABLE nuet_simulator_violations
            ALTER COLUMN details TYPE jsonb USING
                CASE
                    WHEN details IS NULL OR details = '' THEN NULL
                    ELSE details::jsonb
                END;
    END IF;
END $$;
