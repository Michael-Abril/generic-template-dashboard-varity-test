-- Varity Dashboard Database Initialization
-- This database stores ONLY metadata and CID references
-- All actual data is encrypted and stored on Filecoin/IPFS

-- OAuth credentials metadata (CIDs only, not actual credentials)
CREATE TABLE oauth_credentials (
    id SERIAL PRIMARY KEY,
    user_wallet VARCHAR(42) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    credentials_cid VARCHAR(100) NOT NULL,  -- IPFS CID pointing to encrypted credentials
    namespace VARCHAR(200) NOT NULL,         -- customer-{wallet}-oauth-{provider}
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_wallet, provider)
);

-- Integration data CID registry
CREATE TABLE integration_data (
    id SERIAL PRIMARY KEY,
    user_wallet VARCHAR(42) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    data_type VARCHAR(50) NOT NULL,          -- emails, invoices, contacts, etc.
    data_cid VARCHAR(100) NOT NULL,          -- IPFS CID pointing to encrypted data
    namespace VARCHAR(200) NOT NULL,         -- customer-{wallet}-{provider}-{data_type}
    sync_timestamp TIMESTAMP NOT NULL,
    record_count INTEGER DEFAULT 0,          -- Number of records in this batch
    file_size_bytes BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Sync job status tracking
CREATE TABLE sync_jobs (
    id SERIAL PRIMARY KEY,
    user_wallet VARCHAR(42) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    job_type VARCHAR(50) NOT NULL,           -- initial_sync, incremental_sync, full_refresh
    status VARCHAR(20) NOT NULL,             -- pending, running, completed, failed
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    records_synced INTEGER DEFAULT 0,
    error_message TEXT,
    celery_task_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Integration licenses (mirrors on-chain NFT data)
CREATE TABLE integration_licenses (
    id SERIAL PRIMARY KEY,
    user_wallet VARCHAR(42) NOT NULL,
    integration_id INTEGER NOT NULL,         -- References Integration smart contract
    integration_name VARCHAR(100),           -- gmail, quickbooks, etc.
    nft_token_id INTEGER,
    blockchain_tx_hash VARCHAR(66),
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_wallet, integration_id)
);

-- RAG document metadata (Layer 3: Customer-specific)
CREATE TABLE rag_documents (
    id SERIAL PRIMARY KEY,
    user_wallet VARCHAR(42) NOT NULL,
    document_cid VARCHAR(100) NOT NULL,      -- IPFS CID of encrypted document
    namespace VARCHAR(200) NOT NULL,         -- customer-{wallet}-rag-{category}
    document_type VARCHAR(50),               -- invoice, email, contract, etc.
    source_provider VARCHAR(50),             -- gmail, quickbooks, manual_upload, etc.
    title VARCHAR(500),
    metadata JSONB,                          -- Encrypted metadata stored as JSON
    embedding_cid VARCHAR(100),              -- CID of vector embeddings (if computed)
    indexed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User preferences and settings (encrypted)
CREATE TABLE user_settings (
    id SERIAL PRIMARY KEY,
    user_wallet VARCHAR(42) NOT NULL UNIQUE,
    settings_cid VARCHAR(100) NOT NULL,      -- IPFS CID of encrypted settings JSON
    namespace VARCHAR(200) NOT NULL,         -- customer-{wallet}-settings
    last_sync_timestamp TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Celery task results (for async job tracking)
CREATE TABLE celery_task_meta (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(100) NOT NULL UNIQUE,
    user_wallet VARCHAR(42),
    task_name VARCHAR(200),
    status VARCHAR(20),                      -- pending, started, success, failure
    result TEXT,
    traceback TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_oauth_wallet ON oauth_credentials(user_wallet);
CREATE INDEX idx_oauth_provider ON oauth_credentials(provider);
CREATE INDEX idx_oauth_active ON oauth_credentials(is_active);

CREATE INDEX idx_integration_data_wallet ON integration_data(user_wallet);
CREATE INDEX idx_integration_data_provider ON integration_data(provider);
CREATE INDEX idx_integration_data_cid ON integration_data(data_cid);
CREATE INDEX idx_integration_data_timestamp ON integration_data(sync_timestamp);

CREATE INDEX idx_sync_jobs_wallet ON sync_jobs(user_wallet);
CREATE INDEX idx_sync_jobs_status ON sync_jobs(status);
CREATE INDEX idx_sync_jobs_provider ON sync_jobs(provider);
CREATE INDEX idx_sync_jobs_celery_task ON sync_jobs(celery_task_id);

CREATE INDEX idx_licenses_wallet ON integration_licenses(user_wallet);
CREATE INDEX idx_licenses_active ON integration_licenses(is_active);
CREATE INDEX idx_licenses_integration ON integration_licenses(integration_id);

CREATE INDEX idx_rag_docs_wallet ON rag_documents(user_wallet);
CREATE INDEX idx_rag_docs_cid ON rag_documents(document_cid);
CREATE INDEX idx_rag_docs_type ON rag_documents(document_type);
CREATE INDEX idx_rag_docs_indexed ON rag_documents(indexed);
CREATE INDEX idx_rag_docs_provider ON rag_documents(source_provider);

CREATE INDEX idx_user_settings_wallet ON user_settings(user_wallet);

CREATE INDEX idx_celery_task_id ON celery_task_meta(task_id);
CREATE INDEX idx_celery_wallet ON celery_task_meta(user_wallet);
CREATE INDEX idx_celery_status ON celery_task_meta(status);

-- Add comments for documentation
COMMENT ON TABLE oauth_credentials IS 'Stores CID references to encrypted OAuth credentials on Filecoin';
COMMENT ON TABLE integration_data IS 'Registry of all integration data batches stored on Filecoin';
COMMENT ON TABLE sync_jobs IS 'Tracks background sync job status for OAuth integrations';
COMMENT ON TABLE integration_licenses IS 'Mirrors on-chain NFT-based integration licenses';
COMMENT ON TABLE rag_documents IS 'Metadata for customer-specific RAG documents on Filecoin';
COMMENT ON TABLE user_settings IS 'CID reference to encrypted user preferences';
COMMENT ON TABLE celery_task_meta IS 'Celery async task tracking';

-- Insert default data
INSERT INTO user_settings (user_wallet, settings_cid, namespace, created_at)
VALUES ('0x0000000000000000000000000000000000000000', 'QmDefault', 'default-settings', NOW())
ON CONFLICT (user_wallet) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Varity Dashboard database initialized successfully!';
    RAISE NOTICE 'Database: varity_dashboard';
    RAISE NOTICE 'Tables created: 7';
    RAISE NOTICE 'Indexes created: 20+';
END $$;
