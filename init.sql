-- Initialization script for PostgreSQL
-- This script will be executed when the database is first created

-- Create database if it doesn't exist
CREATE DATABASE nest_tg_bot IF NOT EXISTS;

-- Connect to the database
\c nest_tg_bot;

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone
SET timezone = 'Europe/Moscow';

-- Create initial admin user (optional)
-- You can customize this based on your needs
