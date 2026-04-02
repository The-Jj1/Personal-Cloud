-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    profile_picture TEXT,
    storage_quota BIGINT DEFAULT 1073741824, -- 1GB in bytes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Folders Table (Hierarchical)
CREATE TABLE IF NOT EXISTS folders (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    parent_id CHAR(36),
    name VARCHAR(255) NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE,
    UNIQUE KEY unique_folder_per_parent (user_id, parent_id, name)
) ENGINE=InnoDB;

-- Files Table
CREATE TABLE IF NOT EXISTS files (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    folder_id CHAR(36),
    name VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,
    size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
    UNIQUE KEY unique_file_per_folder (folder_id, name)
) ENGINE=InnoDB;

-- Shared Links Table
CREATE TABLE IF NOT EXISTS shared_links (
    id CHAR(36) PRIMARY KEY,
    share_token VARCHAR(64) UNIQUE NOT NULL,
    file_id CHAR(36),
    folder_id CHAR(36),
    expires_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- User Permissions Table (Direct Sharing)
CREATE TABLE IF NOT EXISTS permissions (
    id CHAR(36) PRIMARY KEY,
    folder_id CHAR(36),
    file_id CHAR(36),
    user_id CHAR(36) NOT NULL, -- The user who GETS access
    access_level ENUM('view', 'edit') DEFAULT 'view',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_perm_folder (folder_id, user_id),
    UNIQUE KEY unique_perm_file (file_id, user_id)
) ENGINE=InnoDB;

-- Groups Table
CREATE TABLE IF NOT EXISTS `groups` (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_by CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Group Members Table
CREATE TABLE IF NOT EXISTS group_members (
    id CHAR(36) PRIMARY KEY,
    group_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    role ENUM('member', 'admin') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_group_member (group_id, user_id)
) ENGINE=InnoDB;

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id CHAR(36) PRIMARY KEY,
    sender_id CHAR(36) NOT NULL,
    recipient_id CHAR(36), -- NULL if it's a group message
    group_id CHAR(36), -- NULL if it's a private message
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Friends Table
CREATE TABLE IF NOT EXISTS friends (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL, -- The one who sent the request
    friend_id CHAR(36) NOT NULL, -- The one who receives it
    status ENUM('pending', 'accepted') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_friendship (user_id, friend_id)
) ENGINE=InnoDB;

-- Tickets Table
CREATE TABLE IF NOT EXISTS tickets (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    status ENUM('open', 'closed') DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Ticket Messages Table
CREATE TABLE IF NOT EXISTS ticket_messages (
    id CHAR(36) PRIMARY KEY,
    ticket_id CHAR(36) NOT NULL,
    sender_id CHAR(36) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
