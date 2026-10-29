-- MediCore Database Migration (MySQL)
-- CreateTable Department
CREATE TABLE `Department` (
    `departmentID` VARCHAR(191) NOT NULL,
    `departmentName` VARCHAR(191) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Department_departmentName_key`(`departmentName`),
    UNIQUE INDEX `Department_code_key`(`code`),
    PRIMARY KEY (`departmentID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable User
CREATE TABLE `User` (
    `userID` VARCHAR(191) NOT NULL,
    `username` VARCHAR(100) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `role` ENUM('HOSPITAL_ADMINISTRATOR', 'RECEPTION_STAFF', 'DEPARTMENT_COORDINATOR', 'SYSTEM_ADMINISTRATOR') NOT NULL,
    `departmentID` VARCHAR(36) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_username_key`(`username`),
    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_role_idx`(`role`),
    INDEX `User_departmentID_idx`(`departmentID`),
    PRIMARY KEY (`userID`),
    CONSTRAINT `User_departmentID_fkey` FOREIGN KEY (`departmentID`) REFERENCES `Department`(`departmentID`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable Resource
CREATE TABLE `Resource` (
    `resourceID` VARCHAR(191) NOT NULL,
    `resourceName` VARCHAR(191) NOT NULL,
    `resourceType` ENUM('HOSPITAL_BED', 'OPERATION_THEATRE', 'MEDICAL_EQUIPMENT', 'AMBULANCE', 'DIAGNOSTIC_FACILITY') NOT NULL,
    `subType` VARCHAR(100) NOT NULL,
    `departmentID` VARCHAR(36) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `status` ENUM('AVAILABLE', 'ALLOCATED', 'IN_USE', 'CLEANING_MAINTENANCE', 'OUT_OF_SERVICE', 'UNDER_REPAIR', 'RETIRED_DISPOSED') NOT NULL DEFAULT 'AVAILABLE',
    `quantityTotal` INTEGER NOT NULL DEFAULT 1,
    `quantityAvailable` INTEGER NOT NULL DEFAULT 1,
    `identifierCode` VARCHAR(100) NOT NULL,
    `specifications` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `retiredAt` DATETIME(3) NULL,

    UNIQUE INDEX `Resource_identifierCode_key`(`identifierCode`),
    INDEX `Resource_resourceType_idx`(`resourceType`),
    INDEX `Resource_status_idx`(`status`),
    INDEX `Resource_departmentID_idx`(`departmentID`),
    PRIMARY KEY (`resourceID`),
    CONSTRAINT `Resource_departmentID_fkey` FOREIGN KEY (`departmentID`) REFERENCES `Department`(`departmentID`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable Allocation
CREATE TABLE `Allocation` (
    `allocationID` VARCHAR(191) NOT NULL,
    `resourceID` VARCHAR(36) NOT NULL,
    `userID` VARCHAR(36) NOT NULL,
    `departmentID` VARCHAR(36) NOT NULL,
    `patientReference` VARCHAR(191) NULL,
    `purpose` VARCHAR(255) NOT NULL,
    `priority` ENUM('NORMAL', 'URGENT', 'EMERGENCY') NOT NULL DEFAULT 'NORMAL',
    `startTime` DATETIME(3) NOT NULL,
    `expectedEndTime` DATETIME(3) NULL,
    `actualEndTime` DATETIME(3) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('REQUESTED', 'ALLOCATED', 'IN_USE', 'RELEASED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'ALLOCATED',
    `notes` TEXT NULL,
    `isEmergency` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    INDEX `Allocation_resourceID_idx`(`resourceID`),
    INDEX `Allocation_userID_idx`(`userID`),
    INDEX `Allocation_departmentID_idx`(`departmentID`),
    INDEX `Allocation_status_idx`(`status`),
    PRIMARY KEY (`allocationID`),
    CONSTRAINT `Allocation_resourceID_fkey` FOREIGN KEY (`resourceID`) REFERENCES `Resource`(`resourceID`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `Allocation_userID_fkey` FOREIGN KEY (`userID`) REFERENCES `User`(`userID`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `Allocation_departmentID_fkey` FOREIGN KEY (`departmentID`) REFERENCES `Department`(`departmentID`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable StatusHistory
CREATE TABLE `StatusHistory` (
    `historyID` VARCHAR(191) NOT NULL,
    `resourceID` VARCHAR(36) NOT NULL,
    `previousStatus` ENUM('AVAILABLE', 'ALLOCATED', 'IN_USE', 'CLEANING_MAINTENANCE', 'OUT_OF_SERVICE', 'UNDER_REPAIR', 'RETIRED_DISPOSED') NOT NULL,
    `newStatus` ENUM('AVAILABLE', 'ALLOCATED', 'IN_USE', 'CLEANING_MAINTENANCE', 'OUT_OF_SERVICE', 'UNDER_REPAIR', 'RETIRED_DISPOSED') NOT NULL,
    `changedBy` VARCHAR(36) NOT NULL,
    `reason` VARCHAR(255) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StatusHistory_resourceID_idx`(`resourceID`),
    INDEX `StatusHistory_changedBy_idx`(`changedBy`),
    PRIMARY KEY (`historyID`),
    CONSTRAINT `StatusHistory_resourceID_fkey` FOREIGN KEY (`resourceID`) REFERENCES `Resource`(`resourceID`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `StatusHistory_changedBy_fkey` FOREIGN KEY (`changedBy`) REFERENCES `User`(`userID`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable AuditLog
CREATE TABLE `AuditLog` (
    `auditID` VARCHAR(191) NOT NULL,
    `userID` VARCHAR(36) NULL,
    `action` VARCHAR(100) NOT NULL,
    `entityType` VARCHAR(50) NOT NULL,
    `entityID` VARCHAR(36) NOT NULL,
    `details` TEXT NULL,
    `ipAddress` VARCHAR(50) NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_userID_idx`(`userID`),
    INDEX `AuditLog_action_idx`(`action`),
    INDEX `AuditLog_entityType_idx`(`entityType`),
    INDEX `AuditLog_timestamp_idx`(`timestamp`),
    PRIMARY KEY (`auditID`),
    CONSTRAINT `AuditLog_userID_fkey` FOREIGN KEY (`userID`) REFERENCES `User`(`userID`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable UtilizationReport
CREATE TABLE `UtilizationReport` (
    `reportID` VARCHAR(191) NOT NULL,
    `reportType` VARCHAR(50) NOT NULL,
    `generatedBy` VARCHAR(36) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `summaryData` TEXT NOT NULL,
    `generatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UtilizationReport_generatedBy_idx`(`generatedBy`),
    INDEX `UtilizationReport_reportType_idx`(`reportType`),
    PRIMARY KEY (`reportID`),
    CONSTRAINT `UtilizationReport_generatedBy_fkey` FOREIGN KEY (`generatedBy`) REFERENCES `User`(`userID`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
