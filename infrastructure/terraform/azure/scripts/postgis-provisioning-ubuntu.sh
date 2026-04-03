#!/bin/bash

# Stop in case of error
set -e

DB_PASSWORD="kyNx11B3JW24z957Os4A"
DB_NAME="flight_db"
DATA_DISK="/dev/nvme0n1"
PARTITION="${DATA_DISK}p1"
MOUNT_POINT="/datadisk"
DATA_DIR="$MOUNT_POINT/postgresql/data"
LUN_SYMLINK="/dev/disk/azure/scsi1/lun0"
# ==========================================

echo "Start provisioning PostgreSQL with PostGIS"

# 0. DETERMINE DISK DISCOVERY

echo "Waiting for kernel to enumerate LUN 0"
while [ ! -b "$LUN_SYMLINK" ]; do
    sleep 2
done

# Resolve the Azure symlink to the actual device (e.g. /dev/sdc or /dev/nvme1n1)
DATA_DISK=$(readlink -f "$LUN_SYMLINK")
echo "Data disk physically mapped to: $DATA_DISK"

if [[ "$DATA_DISK" == *"nvme"* ]]; then
    PARTITION="${DATA_DISK}p1" # NVMe convention (e.g., /dev/nvme0n1p1)
else
    PARTITION="${DATA_DISK}1"  # SCSI convention (e.g., /dev/sdc1)
fi

echo "Target partition mapped to: $PARTITION"


# 1. PREPARE DISK
if ! blkid "$PARTITION" > /dev/null 2>&1; then
    echo "Unformatted disk detected. Partitioning and formatting $DATA_DISK..."
    parted "$DATA_DISK" --script mklabel gpt
    parted "$DATA_DISK" --script mkpart primary ext4 0% 100%
    
    # Allow the kernel time to recognize the new partition table
    sleep 3 
    
    mkfs.ext4 "$PARTITION"
else
    echo "Partition $PARTITION already exists. Skipping format to preserve data."
fi

# 2. MOUNT DISK
echo "Configuring mounting point $MOUNT_POINT"
mkdir -p $MOUNT_POINT

# new partition UUID 
UUID=$(blkid -s UUID -o value $PARTITION)

# Add to /etc/fstab, it missing
if ! grep -q "$UUID" /etc/fstab; then
    echo "UUID=$UUID   $MOUNT_POINT   ext4   defaults,nofail   0   2" >> /etc/fstab
fi

# Mount all disks
mount -a

# 3. PACKAGE INSTALLATION
echo "Apt update and install PostgreSQL / PostGIS"
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y postgresql postgresql-contrib postgis rsync


# Allocate PG version
PG_VERSION=$(ls /etc/postgresql/ | head -n 1)
CONF_FILE="/etc/postgresql/$PG_VERSION/main/postgresql.conf"
HBA_FILE="/etc/postgresql/$PG_VERSION/main/pg_hba.conf"

echo "PostgreSQL version: $PG_VERSION"

# 4. DATA MIGRATION AND STATE VERIFICATION

if [ ! -f "$DATA_DIR/PG_VERSION" ]; then
    echo "New deployment detected. Migrating initial data to persistent disk..."
    mkdir -p $DATA_DIR
    chown -R postgres:postgres $MOUNT_POINT/postgresql
    chmod 700 $DATA_DIR

    rsync -a /var/lib/postgresql/$PG_VERSION/main/ $DATA_DIR/

    IS_NEW_DATABASE=true
else
    echo "Existing database state detected on persistent disk. Skipping data migration"
    IS_NEW_DATABASE=false
fi

# 5. NETWORK CONFIGURATION AND PATHS
echo "Applying network configuration paths"

# Change data_directory
sed -i "s|data_directory = '/var/lib/postgresql/$PG_VERSION/main'|data_directory = '$DATA_DIR'|g" $CONF_FILE

# Set listening to (*)
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" $CONF_FILE

# Add 0.0.0.0/0 listening to pg_hba.conf
if ! grep -q "0.0.0.0/0" "$HBA_FILE"; then
    echo "host    all             all             0.0.0.0/0               scram-sha-256" >> $HBA_FILE
fi

# 6. PARAMETER TUNING
echo "Applying postgres performance parameters"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
cp "$CONF_FILE" "${CONF_FILE}.${TIMESTAMP}.bak"

update_param()
{
        local param=$1
        local value=$2

        # Check if param exists (even if commented out) and change it to new value
        if grep -qE "^#?${param}[[:space:]]*=" "$CONF_FILE"; then
                sed -i "s|^#\?${param}[[:space:]]*=.*|${param} = ${value}|" "$CONF_FILE"
        else
                echo "${param} = ${value}" >> "CONF_FILE"
        fi
}

# Parameters values are based on recommendations from PostGIS documentation 
update_param "max_connections" "50"
update_param "shared_buffers" "2GB"
update_param "effective_cache_size" "6GB"
update_param "maintenance_work_mem" "1GB"
update_param "checkpoint_completion_target" "0.9"
update_param "wal_buffers" "16MB"
update_param "default_statistics_target" "100"
update_param "effective_io_concurrency" "200"
update_param "work_mem" "32MB"
update_param "huge_pages" "off"
update_param "min_wal_size" "1GB"
update_param "max_wal_size" "4GB"

# Disks and planist costs
update_param "random_page_cost" "1.1"
update_param "seq_page_cost" "1.0"

# Parallel workers based on 2 vCPUs
update_param "max_worker_processes" "2"
update_param "max_parallel_workers_per_gather" "1"
update_param "max_parallel_workers" "2"

# Additional specific to postgis
update_param "jit" "off"

# 7. SERVICE RESTART AND DATABASE INITIALIZATION
echo "Starting PostgreSQL"
systemctl start postgresql

if [ "$IS_NEW_DATABASE" = true ]; then
    echo "Initializing new database schema and user credentials..."
    sudo -u postgres psql -c "ALTER USER postgres PASSWORD '${DB_PASSWORD}';"
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"
    sudo -u postgres psql -d $DB_NAME -c "CREATE EXTENSION postgis;"
else
    echo "Bypassing schema initialization. Existing data preserved."
    sudo -u postgres psql -c "ALTER USER postgres PASSWORD '${DB_PASSWORD}';"
fi 

echo "=========================================="
echo "SUCCESSFULLY PROVISIONED!"
echo "Version: PostgreSQL $PG_VERSION with PostGIS"
echo "Is it a new database installation? $IS_NEW_DATABASE"
echo "Data Location: $DATA_DIR"
echo "Database '$DB_NAME' created with PostGIS extension"
echo "Database is listening on port 5432 for all IP addresses"
echo "=========================================="
