-- +goose Up
-- Where a component sits on the car: which axle and which side. Both are
-- optional and independent ("передние колодки" have an axle but no side).
ALTER TABLE components
    ADD COLUMN axle text CHECK (axle IN ('front', 'rear')),
    ADD COLUMN side text CHECK (side IN ('left', 'right'));

-- +goose Down
ALTER TABLE components DROP COLUMN side, DROP COLUMN axle;
