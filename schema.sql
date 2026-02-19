-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Folders Table (Hierarchical)
CREATE TABLE IF NOT EXISTS folders (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    parent_id CHAR(36),
    name VARCHAR(255) NOT NULL,
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
