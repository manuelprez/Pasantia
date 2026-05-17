require('dotenv').config();
const express = require('express');
const { ethers } = require('ethers');
const app = express();

const dbType = process.env.DB_TYPE?.toLowerCase() || (process.env.DATABASE_URL?.startsWith('mysql') ? 'mysql' : 'postgres');
const isMysql = dbType === 'mysql';
const isPostgres = dbType === 'postgres';

let pool = null;

const initDb = () => {
  const connectionString = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_DATABASE_URL;

  if (isMysql && !connectionString && process.env.MYSQL_HOST) {
    const mysql = require('mysql2/promise');
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
    return;
  }

  if (!connectionString) {
    return;
  }

  if (isMysql) {
    const mysql = require('mysql2/promise');
    pool = mysql.createPool(connectionString);
  } else {
    const { Pool } = require('pg');
    pool = new Pool({ connectionString });
  }
};

initDb();

const useDb = Boolean(pool);

const param = (index) => (isPostgres ? `$${index}` : '?');

const dbQuery = async (sql, params = []) => {
  if (!useDb) {
    throw new Error('No database configured');
  }

  if (isPostgres) {
    const result = await pool.query(sql, params);
    return result.rows;
  }

  const [rows] = await pool.execute(sql, params);
  return rows;
};

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');
const contractAddress = process.env.CONTRACT_ADDRESS;
let contract = null;

if (contractAddress && process.env.CONTRACT_ABI) {
  const contractAbi = JSON.parse(process.env.CONTRACT_ABI);
  contract = new ethers.Contract(contractAddress, contractAbi, provider);
}

if (contract) {
  contract.on('BatchCreated', (id, buyer, price) => {
    console.log(`Nuevo lote detectado: ${id}`);
    // Aquí insertarías en la base de datos SQL que diseñamos
  });
}

const fallbackSensorLogs = [
  { timestamp: '2026-05-15T10:00:00Z', value: 5.2 },
  { timestamp: '2026-05-15T12:00:00Z', value: 5.8 },
  { timestamp: '2026-05-15T14:00:00Z', value: 6.5 },
  { timestamp: '2026-05-15T16:00:00Z', value: 5.9 },
];

const fallbackBatchEvents = [
  {
    id: 'event-01',
    batch_id: 'batch-01',
    event_name: 'Origen de carga',
    location_name: 'Puerto Buenos Aires',
    timestamp: '2026-05-14T08:30:00Z',
    tx_hash: '0xabc123...789',
    latitude: -34.6037,
    longitude: -58.3816,
  },
  {
    id: 'event-02',
    batch_id: 'batch-01',
    event_name: 'Paso por centro logístico',
    location_name: 'Centro Logístico Quilmes',
    timestamp: '2026-05-14T15:20:00Z',
    tx_hash: '0xdef456...012',
    latitude: -34.7017,
    longitude: -58.4783,
  },
  {
    id: 'event-03',
    batch_id: 'batch-01',
    event_name: 'Destino final',
    location_name: 'Planta de Distribución',
    timestamp: '2026-05-15T09:45:00Z',
    tx_hash: '0xghi789...345',
    latitude: -34.5973,
    longitude: -58.3810,
  },
];

const fallbackBatches = [
  {
    id: 'batch-01',
    blockchain_id: 101,
    status: 'Tránsito',
    buyer_wallet: '0xAbC123...def',
    seller_wallet: '0xDeF456...abc',
    escrow_value: '45000.00',
    last_tx_hash: '0xabc123...789',
    description: 'Contenedor de café verde con certificación orgánica',
    created_at: '2026-05-10T08:00:00Z',
  },
  {
    id: 'batch-02',
    blockchain_id: 102,
    status: 'Entregado',
    buyer_wallet: '0xBcd234...ef0',
    seller_wallet: '0xEfg567...bcd',
    escrow_value: '32000.50',
    last_tx_hash: '0xjkl456...789',
    description: 'Carga de repuestos electrónicos con seguro de transporte',
    created_at: '2026-05-11T10:30:00Z',
  },
  {
    id: 'batch-03',
    blockchain_id: 103,
    status: 'Disputa',
    buyer_wallet: '0xCde345...f01',
    seller_wallet: '0xFgh678...cde',
    escrow_value: '21500.75',
    last_tx_hash: '0xmno789...123',
    description: 'Envío de vinos premium con control de temperatura',
    created_at: '2026-05-12T12:15:00Z',
  },
];

const fallbackDocuments = [
  {
    id: 'doc-01',
    batch_id: 'batch-01',
    ipfs_hash: 'QmTzQ1...abc',
    doc_type: 'Certificado',
    uploaded_at: '2026-05-12T14:20:00Z',
  },
  {
    id: 'doc-02',
    batch_id: 'batch-01',
    ipfs_hash: 'QmRkX3...def',
    doc_type: 'Factura',
    uploaded_at: '2026-05-13T09:10:00Z',
  },
  {
    id: 'doc-03',
    batch_id: 'batch-03',
    ipfs_hash: 'QmYpW7...xyz',
    doc_type: 'Guía',
    uploaded_at: '2026-05-14T11:05:00Z',
  },
];

const normalizeBatchEvents = (rows) => {
  const events = rows.map((row) => ({
    eventName: row.event_name,
    location_name: row.location_name,
    timestamp: row.created_at,
    tx_hash: row.tx_hash,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
  }));

  return events.map((event, index) => {
    const stage = index === 0 ? 'origin' : index === events.length - 1 ? 'destination' : 'intermediate';
    return { ...event, stage };
  });
};

app.get('/api/batches', async (req, res) => {
  if (!useDb) {
    return res.json(fallbackBatches);
  }

  try {
    const rows = await dbQuery('SELECT id, blockchain_id, status, buyer_wallet, seller_wallet, escrow_value, last_tx_hash, description, created_at FROM batches ORDER BY created_at DESC');
    return res.json(rows);
  } catch (error) {
    console.error('Error fetching batches:', error);
    return res.status(500).json({ error: 'Error al leer batches desde la base de datos.' });
  }
});

app.get('/api/batches/:id', async (req, res) => {
  const { id } = req.params;
  if (!useDb) {
    const batch = fallbackBatches.find((item) => item.id === id);
    return batch ? res.json(batch) : res.status(404).json({ error: 'Batch no encontrado.' });
  }

  try {
    const rows = await dbQuery(
      `SELECT id, blockchain_id, status, buyer_wallet, seller_wallet, escrow_value, last_tx_hash, description, created_at FROM batches WHERE id = ${param(1)} LIMIT 1`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Batch no encontrado.' });
    }
    return res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching batch by id:', error);
    return res.status(500).json({ error: 'Error al leer batch desde la base de datos.' });
  }
});

app.patch('/api/batches/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Se requiere el campo status.' });
  }

  if (!useDb) {
    const batchIndex = fallbackBatches.findIndex((item) => item.id === id);
    if (batchIndex === -1) {
      return res.status(404).json({ error: 'Batch no encontrado.' });
    }
    fallbackBatches[batchIndex].status = status;
    return res.json(fallbackBatches[batchIndex]);
  }

  try {
    const existing = await dbQuery(
      `SELECT id FROM batches WHERE id = ${param(1)} LIMIT 1`,
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Batch no encontrado.' });
    }

    await dbQuery(
      `UPDATE batches SET status = ${param(1)} WHERE id = ${param(2)}`,
      [status, id]
    );

    const rows = await dbQuery(
      `SELECT id, blockchain_id, status, buyer_wallet, seller_wallet, escrow_value, last_tx_hash, description, created_at FROM batches WHERE id = ${param(1)} LIMIT 1`,
      [id]
    );
    return res.json(rows[0]);
  } catch (error) {
    console.error('Error updating batch status:', error);
    return res.status(500).json({ error: 'Error al actualizar el estado del batch.' });
  }
});

app.get('/api/batch_documents', async (req, res) => {
  const { batch_id } = req.query;
  if (!useDb) {
    const filtered = batch_id ? fallbackDocuments.filter((item) => item.batch_id === batch_id) : fallbackDocuments;
    return res.json(filtered);
  }

  try {
    const query = batch_id
      ? `SELECT id, batch_id, ipfs_hash, doc_type, uploaded_at FROM batch_documents WHERE batch_id = ${param(1)} ORDER BY uploaded_at DESC`
      : 'SELECT id, batch_id, ipfs_hash, doc_type, uploaded_at FROM batch_documents ORDER BY uploaded_at DESC';
    const params = batch_id ? [batch_id] : [];
    const rows = await dbQuery(query, params);
    return res.json(rows);
  } catch (error) {
    console.error('Error fetching batch documents:', error);
    return res.status(500).json({ error: 'Error al leer batch_documents desde la base de datos.' });
  }
});

app.get('/api/sensor_logs', async (req, res) => {
  if (!useDb) {
    return res.json(fallbackSensorLogs);
  }

  try {
    const { batch_id } = req.query;
    const query = `
      SELECT sl.value, sl.timestamp
      FROM sensor_logs sl
      JOIN sensors s ON sl.sensor_id = s.id
      ${batch_id ? `WHERE s.batch_id = ${param(1)}` : ''}
      ORDER BY sl.timestamp ASC
    `;
    const params = batch_id ? [batch_id] : [];
    const rows = await dbQuery(query, params);
    const data = rows.map((row) => ({
      value: Number(row.value),
      timestamp: row.timestamp instanceof Date ? row.timestamp.toISOString() : row.timestamp,
    }));
    return res.json(data);
  } catch (error) {
    console.error('Error fetching sensor logs:', error);
    return res.status(500).json({ error: 'Error al leer sensor_logs desde la base de datos.' });
  }
});

app.get('/api/batch_events', async (req, res) => {
  if (!useDb) {
    return res.json(fallbackBatchEvents);
  }

  try {
    const { batch_id } = req.query;
    const query = `
      SELECT event_name, location_name, latitude, longitude, tx_hash, created_at
      FROM batch_events
      ${batch_id ? 'WHERE batch_id = $1' : ''}
      ORDER BY created_at ASC
    `;
    const params = batch_id ? [batch_id] : [];
    const rows = await dbQuery(query, params);
    return res.json(normalizeBatchEvents(rows));
  } catch (error) {
    console.error('Error fetching batch events:', error);
    return res.status(500).json({ error: 'Error al leer batch_events desde la base de datos.' });
  }
});

app.listen(3001, () => console.log('Servidor de visualización corriendo en puerto 3001'));