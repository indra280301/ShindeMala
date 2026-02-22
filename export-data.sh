#!/bin/bash
# ============================================
# Export local MySQL data for migration
# Run this on your LOCAL machine (laptop)
# ============================================
# Usage: bash export-data.sh

DB_USER="root"
DB_PASS=""  # Set your local MySQL password here
DB_NAME="shinde_mala_erp"
OUTPUT_FILE="db-init/02-data.sql"

echo "Exporting data from local MySQL..."

# Export data only (no schema, no CREATE statements)
mysqldump -u${DB_USER} -p${DB_PASS} \
    --no-create-info \
    --complete-insert \
    --skip-triggers \
    --single-transaction \
    --quick \
    ${DB_NAME} \
    branches users categories menu_items dining_tables \
    > ${OUTPUT_FILE}

echo "✅ Data exported to ${OUTPUT_FILE}"
echo ""
echo "This file will be automatically loaded when you run deploy.sh"
echo "It runs AFTER 01-schema.sql, so tables already exist."
echo ""
echo "Next steps:"
echo "  1. Commit this file: git add ${OUTPUT_FILE} && git commit -m 'Add data migration'"
echo "  2. Push to GitHub: git push origin main"
echo "  3. SSH into Oracle Cloud and run: bash deploy.sh YOUR_PUBLIC_IP"
