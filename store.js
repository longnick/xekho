const BACKUP_QUOTA_LIMIT = 500 * 1024; // 500KB

function deleteLocalBackup(backupIndex) {
    // Logic to remove a single backup by index
}

function saveLocalBackup(backupData) {
    if (getBackupUsage() + backupData.length > BACKUP_QUOTA_LIMIT) {
        // Logic to clean old backups if needed before saving a new one
    }
    // Logic to save backup data
}

function getBackupUsage() {
    // Logic to calculate and return current storage usage in bytes
    return currentStorageUsage;
}

function deleteBackup(fileName) {
    // Logic to delete an individual backup file
}