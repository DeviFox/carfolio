-- +goose Up
-- "purchase": something the car gets for the first time (a spare wheel, a
-- dashcam). Stored like a replacement: it installs a part.
ALTER TABLE maintenance_events DROP CONSTRAINT maintenance_events_type_check;
ALTER TABLE maintenance_events ADD CONSTRAINT maintenance_events_type_check
    CHECK (type IN ('replacement', 'purchase', 'inspection', 'repair', 'fluid_service', 'observation'));

-- +goose Down
-- Fails while purchase records exist; delete or retype them first.
ALTER TABLE maintenance_events DROP CONSTRAINT maintenance_events_type_check;
ALTER TABLE maintenance_events ADD CONSTRAINT maintenance_events_type_check
    CHECK (type IN ('replacement', 'inspection', 'repair', 'fluid_service', 'observation'));
