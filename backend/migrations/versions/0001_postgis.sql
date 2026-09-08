CREATE EXTENSION IF NOT EXISTS postgis;
-- Initial tables are created from SQLAlchemy metadata in the demo.
-- Production migrations should add GiST indexes to geometry columns once authoritative geometry fields are populated.
