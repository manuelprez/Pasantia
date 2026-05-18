import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  FileText,
  Thermometer,
  ShieldCheck,
  UploadCloud,
  CreditCard,
  AlertTriangle,
  Clock3,
  ExternalLink,
} from 'lucide-react';
import useWeb3 from './hooks/useWeb3';
import BatchRouteMap from './BatchRouteMap';
import BatchTelemetryChart from './BatchTelemetryChart';

const tabs = [
  { id: 'traceability', label: 'Trazabilidad', icon: MapPin },
  { id: 'documentation', label: 'Documentación', icon: FileText },
  { id: 'telemetry', label: 'Telemetría', icon: Thermometer },
];

const batchStatusClasses = {
  Tránsito: 'bg-cyan-500/15 text-cyan-200 border-cyan-500',
  Entregado: 'bg-emerald-500/15 text-emerald-200 border-emerald-500',
  Disputa: 'bg-rose-500/15 text-rose-200 border-rose-500',
};

const fallbackBatch = {
  id: 'batch-01',
  blockchain_id: 101,
  status: 'Tránsito',
  buyer_wallet: '0xAbC123...def',
  seller_wallet: '0xDeF456...abc',
  escrow_value: '45000.00',
  last_tx_hash: '0xabc123...789',
  description: 'Contenedor de café verde con certificación orgánica',
  created_at: '2026-05-10T08:00:00Z',
};

const fallbackEvents = [
  {
    eventName: 'Origen de carga',
    location_name: 'Puerto Buenos Aires',
    timestamp: '2026-05-14T08:30:00Z',
    tx_hash: '0xabc123...789',
    latitude: -34.6037,
    longitude: -58.3816,
    stage: 'origin',
  },
  {
    eventName: 'Paso por centro logístico',
    location_name: 'Centro Logístico Quilmes',
    timestamp: '2026-05-14T15:20:00Z',
    tx_hash: '0xdef456...012',
    latitude: -34.7017,
    longitude: -58.4783,
    stage: 'intermediate',
  },
  {
    eventName: 'Destino final',
    location_name: 'Planta de Distribución',
    timestamp: '2026-05-15T09:45:00Z',
    tx_hash: '0xghi789...345',
    latitude: -34.5973,
    longitude: -58.3810,
    stage: 'destination',
  },
];

const fallbackDocuments = [
  {
    id: 'doc-01',
    ipfs_hash: 'QmTzQ1...abc',
    doc_type: 'Certificado',
    uploaded_at: '2026-05-12T14:20:00Z',
  },
  {
    id: 'doc-02',
    ipfs_hash: 'QmRkX3...def',
    doc_type: 'Factura',
    uploaded_at: '2026-05-13T09:10:00Z',
  },
];

const fallbackSensorData = [
  { timestamp: '2026-05-15T10:00:00Z', value: 5.2 },
  { timestamp: '2026-05-15T12:00:00Z', value: 5.8 },
  { timestamp: '2026-05-15T14:00:00Z', value: 6.5 },
  { timestamp: '2026-05-15T16:00:00Z', value: 5.9 },
];

const ESCROW_CONTRACT_ADDRESS = '0xAaBbCcDdEeFf0011223344556677889900aAbBc';
const ESCROW_CONTRACT_ABI = [
  {
    name: 'liberarPago',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { internalType: 'uint256', name: 'batchId', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'abrirDisputa',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { internalType: 'uint256', name: 'batchId', type: 'uint256' },
      { internalType: 'string', name: 'reason', type: 'string' },
    ],
    outputs: [],
  },
];

const classNames = (...classes) => classes.filter(Boolean).join(' ');

const BatchDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { userAddress, connectWallet, getContractInstance } = useWeb3();

  const [batch, setBatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [sensorData, setSensorData] = useState([]);
  const [activeTab, setActiveTab] = useState('traceability');
  const [actionMessage, setActionMessage] = useState('');
  const [contractMessage, setContractMessage] = useState('');
  const [contractLoading, setContractLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBatchDetail = async () => {
      try {
        const [batchRes, eventsRes, docsRes, logsRes] = await Promise.all([
          fetch(`/api/batches/${id}`),
          fetch(`/api/batch_events?batch_id=${id}`),
          fetch(`/api/batch_documents?batch_id=${id}`),
          fetch(`/api/sensor_logs?batch_id=${id}`),
        ]);

        if (!batchRes.ok) throw new Error('Batch no encontrado.');

        const [batchData, eventsData, docsData, logsData] = await Promise.all([
          batchRes.json(),
          eventsRes.ok ? eventsRes.json() : Promise.resolve(fallbackEvents),
          docsRes.ok ? docsRes.json() : Promise.resolve(fallbackDocuments),
          logsRes.ok ? logsRes.json() : Promise.resolve(fallbackSensorData),
        ]);

        setBatch(batchData);
        setEvents(eventsData.length ? eventsData : fallbackEvents);
        setDocuments(docsData.length ? docsData : fallbackDocuments);
        setSensorData(logsData.length ? logsData : fallbackSensorData);
      } catch (error) {
        setBatch(fallbackBatch);
        setEvents(fallbackEvents);
        setDocuments(fallbackDocuments);
        setSensorData(fallbackSensorData);
      } finally {
        setLoading(false);
      }
    };

    loadBatchDetail();
  }, [id]);

  const handleReleasePayment = async () => {
    try {
      const batchId = Number(selectedBatch.id);
      if (!batchId || Number.isNaN(batchId)) {
        throw new Error('Batch ID inválido para la transacción.');
      }

      const contract = getContractInstance(ESCROW_CONTRACT_ADDRESS, ESCROW_CONTRACT_ABI);
      if (!contract?.liberarPago) {
        throw new Error('Contrato no disponible');
      }

      const tx = await contract.liberarPago(batchId);
      await tx.wait();
      setActionMessage('Pago liberado correctamente en la blockchain.');
    } catch (err) {
      setActionMessage(err?.message || 'Error al liberar el pago. Conecta tu wallet y verifica el contrato.');
    }
  };

  const handleOpenDispute = async () => {
    try {
      const batchId = Number(selectedBatch.id);
      if (!batchId || Number.isNaN(batchId)) {
        throw new Error('Batch ID inválido para la disputa.');
      }

      const reason = window.prompt('Describe brevemente el motivo de la disputa:', 'Disputa de calidad');
      if (!reason) {
        throw new Error('Se necesita un motivo para abrir la disputa.');
      }

      const contract = getContractInstance(ESCROW_CONTRACT_ADDRESS, ESCROW_CONTRACT_ABI);
      if (!contract?.abrirDisputa) {
        throw new Error('Contrato no disponible');
      }

      const tx = await contract.abrirDisputa(batchId, reason);
      await tx.wait();

      setActionMessage('Disputa abierta correctamente en la blockchain.');
      setBatch((current) => ({ ...current, status: 'Disputa' }));
    } catch (err) {
      setActionMessage(err?.message || 'Error al abrir la disputa. Conecta tu wallet y verifica el contrato.');
    }
  };

  const handleUploadCertificate = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setActionMessage('Subiendo certificado a IPFS...');
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setActionMessage(`Certificado subido: QmFakeHash${file.name.slice(0, 4)}`);
  };

  const handleDownloadContract = async () => {
    setContractLoading(true);
    setContractMessage('');
    try {
      const body = {
        batchId: selectedBatch.id,
        buyerWallet: selectedBatch.buyer_wallet,
        sellerWallet: selectedBatch.seller_wallet,
        arbiterWallet: contractArbiterWallet,
        amountLocked: selectedBatch.escrow_value,
        status: selectedBatch.status,
        tx_hash: selectedBatch.last_tx_hash,
      };

      const response = await fetch('/api/contracts/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('No se pudo generar el contrato.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Contrato_Escrow_${selectedBatch.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setContractMessage('Contrato descargado correctamente.');
    } catch (err) {
      setContractMessage(err.message || 'Error al generar el contrato.');
    } finally {
      setContractLoading(false);
    }
  };

  const selectedBatch = batch || fallbackBatch;
  const contractArbiterWallet = selectedBatch.arbiter_wallet || '0x0000000000000000000000000000000000000000';

  const statusClass = batchStatusClasses[selectedBatch.status] || 'bg-slate-700 text-slate-100 border-slate-600';

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
    [events]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-12 w-12 mx-auto rounded-full border-4 border-cyan-400 animate-spin border-t-transparent"></div>
          <p>Cargando vista detallada del lote...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 md:px-8 lg:px-12">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al dashboard
          </button>
          <h1 className="mt-4 text-3xl font-semibold">Detalle del Lote</h1>
          <p className="mt-2 text-slate-400 max-w-2xl">Visualiza trazabilidad, documentación e indicadores IoT del lote seleccionado.</p>
        </div>
        <div className="space-y-2 text-right">
          <div className={classNames('inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm', statusClass)}>
            <span>Status:</span>
            <strong>{selectedBatch.status}</strong>
          </div>
          <div className="text-xs text-slate-400">Escrow total: <strong>{Number(selectedBatch.escrow_value).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</strong></div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Resumen del lote</h2>
                <p className="text-slate-400 mt-2">ID: {selectedBatch.id} · Blockchain ID: {selectedBatch.blockchain_id}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200">
                {selectedBatch.description}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm uppercase text-slate-500">Comprador</p>
                <p className="mt-2 text-slate-100 font-semibold">{selectedBatch.buyer_wallet}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm uppercase text-slate-500">Vendedor</p>
                <p className="mt-2 text-slate-100 font-semibold">{selectedBatch.seller_wallet}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4 lg:p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm text-slate-300">
                <Clock3 className="h-4 w-4 text-cyan-400" /> Línea de tiempo
              </div>
              <div className="text-sm text-slate-500">{sortedEvents.length} eventos</div>
            </div>
            <div className="space-y-4">
              {sortedEvents.map((event, index) => (
                <div key={`${event.eventName}-${index}`} className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-4">
                  <div className="absolute left-4 top-5 h-3 w-3 rounded-full bg-cyan-400" />
                  <div className="ml-6 space-y-1">
                    <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
                      <span>{new Date(event.timestamp).toLocaleString()}</span>
                      <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase text-slate-400">{event.stage}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-100">{event.eventName}</h3>
                    <p className="text-sm text-slate-400">{event.location_name || 'Ubicación no disponible'}</p>
                    <a
                      href={`https://etherscan.io/tx/${event.tx_hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-100 text-sm"
                    >
                      Ver transacción <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4 lg:p-6">
            <div className="mb-4 flex items-center gap-3">
              <Thermometer className="h-5 w-5 text-cyan-400" />
              <h3 className="text-lg font-semibold">Panel de pestañas</h3>
            </div>
            <div className="mb-6 flex flex-wrap gap-3">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={classNames(
                      'inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm transition',
                      activeTab === tab.id
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-950 text-slate-400 hover:bg-slate-800'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {activeTab === 'traceability' && (
              <div className="space-y-6">
                <BatchRouteMap events={sortedEvents} />
              </div>
            )}

            {activeTab === 'documentation' && (
              <div className="space-y-4">
                {documents.length === 0 ? (
                  <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 text-slate-400">No hay documentos disponibles para este lote.</div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {documents.map((doc) => (
                      <a
                        key={doc.id}
                        href={`https://ipfs.io/ipfs/${doc.ipfs_hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="group rounded-3xl border border-slate-800 bg-slate-950 p-5 transition hover:border-cyan-500"
                      >
                        <div className="mb-3 flex items-center gap-3 text-cyan-300">
                          <FileText className="h-5 w-5" />
                          <div>
                            <p className="font-semibold text-slate-100">{doc.doc_type}</p>
                            <p className="text-xs text-slate-500">{new Date(doc.uploaded_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <p className="text-sm text-slate-400 break-words">{doc.ipfs_hash}</p>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'telemetry' && (
              <div className="space-y-4">
                <BatchTelemetryChart data={sensorData} />
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl lg:sticky lg:top-6">
          <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-950 p-5">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Acciones del lote</p>
            <p className="mt-3 text-lg font-semibold text-slate-100">Operaciones en cadena</p>
          </div>
          <button
            type="button"
            onClick={handleReleasePayment}
            className="inline-flex w-full items-center justify-center gap-2 rounded-3xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            <CreditCard className="h-5 w-5" /> Liberar Pago
          </button>
          <button
            type="button"
            onClick={handleOpenDispute}
            className="inline-flex w-full items-center justify-center gap-2 rounded-3xl border border-rose-500 bg-slate-950 px-4 py-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10"
          >
            <AlertTriangle className="h-5 w-5" /> Abrir Disputa
          </button>
          <button
            type="button"
            onClick={handleDownloadContract}
            disabled={contractLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-3xl border border-cyan-500 bg-slate-950 px-4 py-3 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileText className="h-5 w-5" /> {contractLoading ? 'Generando contrato...' : 'Descargar Contrato'}
          </button>
          <button
            type="button"
            onClick={handleUploadCertificate}
            className="inline-flex w-full items-center justify-center gap-2 rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-500"
          >
            <UploadCloud className="h-5 w-5" /> Subir Certificado
          </button>
          <input ref={fileInputRef} type="file" hidden onChange={onFileChange} />

          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
            <p className="font-semibold text-slate-100">Estado de acción</p>
            <p className="mt-3 min-h-[60px]">{actionMessage || 'Selecciona una acción para ver el estado aquí.'}</p>
            {contractMessage && (
              <p className="mt-3 text-sm text-cyan-300">{contractMessage}</p>
            )}
          </div>

          {!userAddress && (
            <button
              type="button"
              onClick={connectWallet}
              className="inline-flex w-full items-center justify-center gap-2 rounded-3xl bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
            >
              <ShieldCheck className="h-5 w-5" /> Conectar Wallet
            </button>
          )}
        </aside>
      </div>
    </div>
  );
};

export default BatchDetailPage;
