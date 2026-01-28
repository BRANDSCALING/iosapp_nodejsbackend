#!/bin/bash
# Run database migration for layer columns

export PGPASSWORD='Letmein786!'

psql -h database-2-brandscaling-ios-instance-1.cc1k8qu4cwi2.us-east-1.rds.amazonaws.com \
     -U database_ios \
     -d postgres \
     -f /Users/brandscaling/Documents/Zipfiles/brandscaling-nodejs-backend/database/012_add_detailed_layer_columns.sql

echo "Migration complete!"


