ALTER TABLE prayer_app.member_roster ADD COLUMN IF NOT EXISTS officer_role varchar(20);
ALTER TABLE prayer_app.member_roster ADD CONSTRAINT member_roster_officer_role_check CHECK (officer_role IS NULL OR officer_role = 'treasurer');
