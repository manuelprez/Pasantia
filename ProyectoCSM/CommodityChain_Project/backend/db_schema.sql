CREATE TABLE users (
    wallet_address CHAR(42) NOT NULL PRIMARY KEY,
    username VARCHAR(50),
    role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'Proveedor', 'Comprador')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE auth_users (
    username VARCHAR(50) NOT NULL PRIMARY KEY,
    password VARCHAR(128) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'Proveedor', 'Comprador')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE batches (
    id CHAR(36) NOT NULL PRIMARY KEY,
    blockchain_id INT NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Tránsito', 'Entregado', 'Disputa', 'Finalizado')),
    buyer_wallet CHAR(42),
    seller_wallet CHAR(42),
    escrow_value DECIMAL(18, 8),
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_wallet) REFERENCES users(wallet_address),
    FOREIGN KEY (seller_wallet) REFERENCES users(wallet_address)
);

CREATE TABLE batch_documents (
    id CHAR(36) NOT NULL PRIMARY KEY,
    batch_id CHAR(36),
    ipfs_hash VARCHAR(100) NOT NULL,
    doc_type VARCHAR(50),
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES batches(id)
);

CREATE TABLE sensors (
    id CHAR(36) NOT NULL PRIMARY KEY,
    batch_id CHAR(36),
    sensor_type VARCHAR(30),
    last_value DECIMAL(10, 2),
    unit VARCHAR(10),
    FOREIGN KEY (batch_id) REFERENCES batches(id)
);

CREATE TABLE sensor_logs (
    id BIGINT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    sensor_id CHAR(36),
    value DECIMAL(10, 2) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sensor_id) REFERENCES sensors(id)
);

CREATE TABLE batch_events (
    id CHAR(36) NOT NULL PRIMARY KEY,
    batch_id CHAR(36),
    event_name VARCHAR(100),
    location_name VARCHAR(100),
    latitude DECIMAL(9, 6),
    longitude DECIMAL(9, 6),
    tx_hash CHAR(66),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES batches(id)
);

-- Tabla para almacenar contratos generados por la UI (compatible con ContractManager)
CREATE TABLE contracts (
    id BIGINT NOT NULL PRIMARY KEY,
    contract_id VARCHAR(64) NOT NULL UNIQUE,
    data JSON,
    status VARCHAR(30) NOT NULL,
    hash VARCHAR(128),
    block BIGINT,
    signatures JSON,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
