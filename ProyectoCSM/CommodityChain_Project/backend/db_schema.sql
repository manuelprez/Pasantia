CREATE TABLE batches (
    id UUID PRIMARY KEY,
    blockchain_id INT UNIQUE,
    status VARCHAR(20),
    temp_avg DECIMAL(5,2),
    buyer_wallet CHAR(42),
    created_at TIMESTAMP DEFAULT NOW()
);