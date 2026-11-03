-- +goose Up
-- The garage, one table per collection of the client's GarageData.
--
-- Ids are UUIDs made by the client, so a record keeps its id from the first
-- write in the browser onwards. Every key starts with user_id: one user's ids
-- can never collide with or point at another user's rows, and every foreign
-- key checks the owner along with the id.
--
-- Calendar days (a service date) are `date`; moments (a mileage reading,
-- when a car was added) are `timestamptz`.

CREATE TABLE vehicles (
    user_id            uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    id                 uuid        NOT NULL,
    name               text        NOT NULL,
    make               text        NOT NULL,
    model              text        NOT NULL,
    year               smallint,
    fuel_type          text,
    engine             text,
    body_type          text CHECK (body_type IN ('sedan', 'hatchback', 'wagon', 'coupe', 'crossover',
                                                 'suv', 'pickup', 'minivan', 'van', 'other')),
    current_mileage_km integer CHECK (current_mileage_km >= 0),
    units              text        NOT NULL CHECK (units IN ('km', 'mi')),
    created_at         timestamptz NOT NULL,
    updated_at         timestamptz NOT NULL,
    PRIMARY KEY (user_id, id)
);

CREATE TABLE vehicle_systems (
    user_id     uuid    NOT NULL,
    id          uuid    NOT NULL,
    vehicle_id  uuid    NOT NULL,
    name        text    NOT NULL,
    category    text    NOT NULL CHECK (category IN ('engine', 'transmission', 'brakes', 'suspension', 'tires',
                                                     'electrical', 'cooling', 'body', 'other')),
    sort_order  integer NOT NULL,
    is_archived boolean NOT NULL,
    PRIMARY KEY (user_id, id),
    FOREIGN KEY (user_id, vehicle_id) REFERENCES vehicles (user_id, id) ON DELETE CASCADE
);
CREATE INDEX vehicle_systems_vehicle_idx ON vehicle_systems (user_id, vehicle_id);

CREATE TABLE components (
    user_id     uuid    NOT NULL,
    id          uuid    NOT NULL,
    vehicle_id  uuid    NOT NULL,
    system_id   uuid    NOT NULL,
    name        text    NOT NULL,
    kind        text    NOT NULL CHECK (kind IN ('consumable', 'replaceable', 'inspectable')),
    fluid       text,
    is_archived boolean NOT NULL,
    PRIMARY KEY (user_id, id),
    FOREIGN KEY (user_id, vehicle_id) REFERENCES vehicles (user_id, id) ON DELETE CASCADE,
    FOREIGN KEY (user_id, system_id) REFERENCES vehicle_systems (user_id, id) ON DELETE CASCADE
);
CREATE INDEX components_vehicle_idx ON components (user_id, vehicle_id);
CREATE INDEX components_system_idx ON components (user_id, system_id);

CREATE TABLE installed_parts (
    user_id                 uuid    NOT NULL,
    id                      uuid    NOT NULL,
    component_id            uuid    NOT NULL,
    installed_at_mileage_km integer CHECK (installed_at_mileage_km >= 0),
    installed_at_date       date,
    expected_life_km        integer CHECK (expected_life_km >= 0),
    expected_life_days      integer CHECK (expected_life_days >= 0),
    removed_at_mileage_km   integer CHECK (removed_at_mileage_km >= 0),
    removed_at_date         date,
    notes                   text,
    PRIMARY KEY (user_id, id),
    FOREIGN KEY (user_id, component_id) REFERENCES components (user_id, id) ON DELETE CASCADE
);
CREATE INDEX installed_parts_component_idx ON installed_parts (user_id, component_id);

CREATE TABLE maintenance_events (
    user_id           uuid    NOT NULL,
    id                uuid    NOT NULL,
    vehicle_id        uuid    NOT NULL,
    type              text    NOT NULL CHECK (type IN ('replacement', 'inspection', 'repair',
                                                       'fluid_service', 'observation')),
    date              date    NOT NULL,
    mileage_km        integer CHECK (mileage_km >= 0),
    installed_part_id uuid,
    cost_minor_units  bigint  CHECK (cost_minor_units >= 0),
    currency          text,
    notes             text,
    PRIMARY KEY (user_id, id),
    FOREIGN KEY (user_id, vehicle_id) REFERENCES vehicles (user_id, id) ON DELETE CASCADE,
    -- Losing the part keeps the record: only the link is cleared, not user_id.
    FOREIGN KEY (user_id, installed_part_id) REFERENCES installed_parts (user_id, id)
        ON DELETE SET NULL (installed_part_id)
);
CREATE INDEX maintenance_events_vehicle_idx ON maintenance_events (user_id, vehicle_id);
CREATE INDEX maintenance_events_part_idx ON maintenance_events (user_id, installed_part_id);

-- MaintenanceEvent.componentIds; position keeps the client's order.
CREATE TABLE event_components (
    user_id      uuid     NOT NULL,
    event_id     uuid     NOT NULL,
    component_id uuid     NOT NULL,
    position     smallint NOT NULL,
    PRIMARY KEY (user_id, event_id, component_id),
    FOREIGN KEY (user_id, event_id) REFERENCES maintenance_events (user_id, id) ON DELETE CASCADE,
    FOREIGN KEY (user_id, component_id) REFERENCES components (user_id, id) ON DELETE CASCADE
);
CREATE INDEX event_components_component_idx ON event_components (user_id, component_id);

CREATE TABLE mileage_entries (
    user_id    uuid        NOT NULL,
    id         uuid        NOT NULL,
    vehicle_id uuid        NOT NULL,
    mileage_km integer     NOT NULL CHECK (mileage_km >= 0),
    date       timestamptz NOT NULL,
    source     text        NOT NULL CHECK (source IN ('owner', 'service', 'estimate')),
    PRIMARY KEY (user_id, id),
    FOREIGN KEY (user_id, vehicle_id) REFERENCES vehicles (user_id, id) ON DELETE CASCADE
);
CREATE INDEX mileage_entries_vehicle_idx ON mileage_entries (user_id, vehicle_id);

CREATE TABLE inspections (
    user_id      uuid    NOT NULL,
    id           uuid    NOT NULL,
    component_id uuid    NOT NULL,
    date         date    NOT NULL,
    mileage_km   integer CHECK (mileage_km >= 0),
    condition    text    NOT NULL CHECK (condition IN ('good', 'worn', 'critical', 'unknown')),
    notes        text,
    PRIMARY KEY (user_id, id),
    FOREIGN KEY (user_id, component_id) REFERENCES components (user_id, id) ON DELETE CASCADE
);
CREATE INDEX inspections_component_idx ON inspections (user_id, component_id);

CREATE TABLE reminders (
    user_id           uuid    NOT NULL,
    id                uuid    NOT NULL,
    vehicle_id        uuid    NOT NULL,
    component_id      uuid,
    title             text    NOT NULL,
    due_at_mileage_km integer CHECK (due_at_mileage_km >= 0),
    due_at_date       date,
    priority          text    NOT NULL CHECK (priority IN ('low', 'normal', 'high')),
    status            text    NOT NULL CHECK (status IN ('open', 'done', 'dismissed')),
    PRIMARY KEY (user_id, id),
    FOREIGN KEY (user_id, vehicle_id) REFERENCES vehicles (user_id, id) ON DELETE CASCADE,
    -- MATCH SIMPLE: a reminder with no component skips this check.
    FOREIGN KEY (user_id, component_id) REFERENCES components (user_id, id) ON DELETE CASCADE
);
CREATE INDEX reminders_vehicle_idx ON reminders (user_id, vehicle_id);
CREATE INDEX reminders_component_idx ON reminders (user_id, component_id);

-- +goose Down
DROP TABLE reminders;
DROP TABLE inspections;
DROP TABLE mileage_entries;
DROP TABLE event_components;
DROP TABLE maintenance_events;
DROP TABLE installed_parts;
DROP TABLE components;
DROP TABLE vehicle_systems;
DROP TABLE vehicles;
