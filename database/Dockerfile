# Filename: Dockerfile
FROM postgis/postgis:17-3.5

ENV POSTGRES_DB=flight_management
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=postgres

EXPOSE 5432

COPY init.sql /docker-entrypoint-initdb.d/10-init.sql
