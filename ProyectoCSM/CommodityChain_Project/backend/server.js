require('dotenv').config();
const express = require('express');
const PDFDocument = require('pdfkit');
const { ethers } = require('ethers');
const app = express();
app.use(express.json());

const dbType = process.env.DB_TYPE?.toLowerCase()
  || (process.env.DATABASE_URL?.startsWith('mysql') ? 'mysql'
  : process.env.MYSQL_HOST || process.env.MYSQL_URL || process.env.MYSQL_DATABASE_URL ? 'mysql'
  : 'postgres');
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

if (useDb) {
  console.log(`Database configured: ${dbType.toUpperCase()}`);
} else {
  console.log('Database not configured. Usando datos simulados.');
}

const validateDbConnection = async () => {
  if (!useDb) return;
  try {
    if (isPostgres) {
      await pool.query('SELECT 1');
    } else {
      await pool.execute('SELECT 1');
    }
    console.log('Database connection validated successfully.');
  } catch (error) {
    console.error('Database validation failed:', error.message || error);
  }
};

validateDbConnection();

// Retorna el placeholder correcto según el motor ($1, $2 para Postgres, ? para MySQL)
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
  });
}

// --- FALLBACK DATA ---
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
];

const fallbackDocuments = [
  {
    id: 'doc-01',
    batch_id: 'batch-01',
    ipfs_hash: 'QmTzQ1...abc',
    doc_type: 'Certificado',
    uploaded_at: '2026-05-12T14:20:00Z',
  },
];

const normalizeBatchEvents = (rows) => {
  const events = rows.map((row) => ({
    eventName: row.event_name,
    location_name: row.location_name,
    timestamp: row.created_at, // Asegúrate de que apunte a la columna devuelta por la BD
    tx_hash: row.tx_hash,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
  }));

  return events.map((event, index) => {
    const stage = index === 0 ? 'origin' : index === events.length - 1 ? 'destination' : 'intermediate';
    return { ...event, stage };
  });
};

// --- ENDPOINTS ---

app.get('/api/batches', async (req, res) => {
  if (!useDb) return res.json(fallbackBatches);
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
    // CORREGIDO: Uso correcto de marcadores parametrizados dinámicos
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

  if (!status) return res.status(400).json({ error: 'Se requiere el campo status.' });

  if (!useDb) {
    const batchIndex = fallbackBatches.findIndex((item) => item.id === id);
    if (batchIndex === -1) return res.status(404).json({ error: 'Batch no encontrado.' });
    fallbackBatches[batchIndex].status = status;
    return res.json(fallbackBatches[batchIndex]);
  }

  try {
    const existing = await dbQuery(`SELECT id FROM batches WHERE id = ${param(1)} LIMIT 1`, [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Batch no encontrado.' });

    // CORREGIDO: Orden posicional estricto de parámetros (? , ?) o ($1, $2)
    await dbQuery(
      `UPDATE batches SET status = ${param(1)} WHERE id = ${param(2)}`,
      [status, id]
    );

    const rows = await dbQuery(`SELECT id, blockchain_id, status, buyer_wallet, seller_wallet, escrow_value, last_tx_hash, description, created_at FROM batches WHERE id = ${param(1)} LIMIT 1`, [id]);
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
  if (!useDb) return res.json(fallbackSensorLogs);

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

app.post('/api/contracts/generate-pdf', async (req, res) => {
  const {
    batchId,
    buyerWallet,
    sellerWallet,
    arbiterWallet,
    amountLocked,
    status,
    tx_hash,
    projectName = 'CommodityChain - Sistema de Trazabilidad de Lotes',
  } = req.body;

  if (!batchId || !buyerWallet || !sellerWallet || !arbiterWallet || !amountLocked || !status || !tx_hash) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos para generar el PDF.' });
  }

  let batchData = { batchId, buyerWallet, sellerWallet, arbiterWallet, amountLocked, status, tx_hash };

  if (useDb) {
    try {
      const rows = await dbQuery(
        `SELECT id, buyer_wallet, seller_wallet, status, escrow_value, last_tx_hash FROM batches WHERE id = ${param(1)} LIMIT 1`,
        [batchId]
      );
      if (rows.length > 0) {
        batchData = {
          batchId: rows[0].id,
          buyerWallet: rows[0].buyer_wallet || buyerWallet,
          sellerWallet: rows[0].seller_wallet || sellerWallet,
          arbiterWallet,
          amountLocked: rows[0].escrow_value || amountLocked,
          status: rows[0].status || status,
          tx_hash: rows[0].last_tx_hash || tx_hash,
        };
      }
    } catch (error) {
      console.error('Error reading batch data for PDF generation:', error);
    }
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Contrato_Escrow_${batchData.batchId}.pdf"`);

  const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
  doc.pipe(res);

  doc.fillColor('#0B2545').fontSize(18).font('Helvetica-Bold').text(projectName, { align: 'center' });
  doc.moveDown(0.3);
  doc.fillColor('#555555').fontSize(11).font('Helvetica').text('Contrato de custodia escueta entre las partes involucradas en el batch registrado en blockchain.', { align: 'center' });
  doc.moveDown(1);
  doc.strokeColor('#CCCCCC').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(1);

  doc.fontSize(12).fillColor('#1a1a1a').font('Helvetica-Bold').text('Resumen del Acuerdo');
  doc.moveDown(0.5);

  const tableRows = [
    ['Batch ID', String(batchData.batchId)],
    ['Estado del Acuerdo', String(batchData.status)],
    ['Monto Bloqueado', String(batchData.amountLocked)],
    ['Wallet Comprador', String(batchData.buyerWallet)],
    ['Wallet Vendedor', String(batchData.sellerWallet)],
    ['Wallet Árbitro', String(batchData.arbiterWallet)],
    ['Hash de Transacción', String(batchData.tx_hash)],
  ];

  const labelX = 60;
  const valueX = 220;
  tableRows.forEach(([label, value]) => {
    doc.font('Helvetica-Bold').fillColor('#0B2545').fontSize(10).text(label, labelX, doc.y, { continued: true });
    doc.font('Helvetica').fillColor('#333333').text(value, valueX, doc.y);
    doc.moveDown(0.8);
  });

  doc.moveDown(1);
  doc.fillColor('#0B2545').font('Helvetica-Bold').fontSize(12).text('Cláusulas del Acuerdo');
  doc.moveDown(0.5);

  const clauses = [
    '1. Objeto: El presente contrato de custodia asegura el pago del comprador al vendedor asociado al lote indicado y anclado en la blockchain.',
    '2. Depósito: El comprador debe ejecutar depositarFondos() para bloquear el monto en el contrato antes de liberar el pago.',
    '3. Liberación: El pago puede liberarse mediante liberarPago() por el comprador o el árbitro autorizado una vez verificado el cumplimiento.',
    '4. Disputa: Si existe desacuerdo, cualquiera de las partes puede abrirDisputa() para activar la intervención del árbitro.',
    '5. Autenticidad: El hash de transacción registrado es la prueba inmutable de la operación y constará como sello de autenticidad.',
  ];

  doc.font('Helvetica').fontSize(10).fillColor('#333333');
  clauses.forEach((clause) => doc.text(clause, { align: 'justify', paragraphGap: 6 }));

  doc.moveDown(1);
  doc.fillColor('#0B2545').font('Helvetica-Bold').text('Declaración de las Partes');
  doc.moveDown(0.4);
  doc.font('Helvetica').fontSize(10).fillColor('#333333').text('Las partes declaran haber leído y comprendido los términos descritos en este documento.', { align: 'justify' });

  doc.moveDown(1.2);
  const signatureY = doc.y;
  const signatureWidth = 150;
  const signatureGap = 40;

  doc.font('Helvetica-Bold').fontSize(10).fillColor('#0B2545').text('Comprador', labelX, signatureY);
  doc.font('Helvetica').fontSize(9).fillColor('#333333').text(batchData.buyerWallet, labelX, doc.y, { width: signatureWidth });

  doc.font('Helvetica-Bold').fontSize(10).fillColor('#0B2545').text('Vendedor', labelX + signatureWidth + signatureGap, signatureY);
  doc.font('Helvetica').fontSize(9).fillColor('#333333').text(batchData.sellerWallet, labelX + signatureWidth + signatureGap, doc.y, { width: signatureWidth });

  doc.moveDown(2);
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#0B2545').text('Árbitro', labelX);
  doc.font('Helvetica').fontSize(9).fillColor('#333333').text(batchData.arbiterWallet, labelX, doc.y, { width: signatureWidth });

  doc.moveDown(1.5);
  doc.rect(50, doc.y, 500, 60).fillOpacity(0.05).fill('#0B2545');
  doc.fillOpacity(1).font('Helvetica-Bold').fontSize(10).fillColor('#0B2545').text('Sello de Autenticidad (Hash de Transacción)', 55, doc.y + 8);
  doc.font('Helvetica').fontSize(10).fillColor('#333333').text(batchData.tx_hash, 55, doc.y + 25);

  doc.end();
});

app.get('/api/batch_events', async (req, res) => {
  if (!useDb) return res.json(fallbackBatchEvents);
  try {
    const { batch_id } = req.query;
    const query = `
      SELECT event_name, location_name, latitude, longitude, tx_hash, created_at
      FROM batch_events
      ${batch_id ? `WHERE batch_id = ${param(1)}` : ''}
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

app.get('/api/db-status', async (req, res) => {
  if (!useDb) return res.json({ status: 'no-db', message: 'Base de datos no configurada.' });
  try {
    if (isPostgres) {
      await pool.query('SELECT 1');
    } else {
      await pool.execute('SELECT 1');
    }
    return res.json({ status: 'ok', dbType: dbType, message: 'Conexión a la base de datos OK.' });
  } catch (error) {
    console.error('DB status error:', error);
    return res.status(500).json({ status: 'error', dbType: dbType, message: 'No se pudo conectar a la base de datos.' });
  }
});

app.listen(3001, () => console.log('Servidor de visualización corriendo en puerto 3001'));