# Database migrations

For a production deployment, run Alembic migrations against PostgreSQL/PostGIS. The ORM metadata is the source of truth for this prototype; `Base.metadata.create_all()` is used on startup for zero-friction demo execution. The SQL below enables PostGIS and provides the initial spatial extension boundary.
