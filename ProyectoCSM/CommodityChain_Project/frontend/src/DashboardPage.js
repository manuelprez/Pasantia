import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Filter, Search, Sparkles, MapPin, Clock, FileText, Activity,
  Shield, Settings, ChevronRight, AlertTriangle, CheckCircle2,
  Truck, Upload, DollarSign, X, Menu, Bell, User, Thermometer,
  Droplets, Wind, Zap, Package, Lock, Unlock, Plus, RefreshCw,
  Download, Eye, Hash, BarChart3, Globe, Cpu, ChevronDown, Circle, ShieldCheck
} from 'lucide-react';

import useWeb3 from './hooks/useWeb3';
import BatchTelemetryChart from './BatchTelemetryChart';
import BatchRouteMap from './BatchRouteMap';

// ─── CONFIGURACIÓN DE CONTRATO (MAPPED TO COMMODITYESCROW.SOL) ────────────────
const ESCROW_CONTRACT_ADDRESS = '0xf8e81D47203A594245E36C48e151709F0C19fBe8';
const ESCROW_CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "batchId", "type": "uint256" }
    ],
    "name": "liberarPago",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "batchId", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "abrirDisputa",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// ─── DATOS FALLBACKS ─────────────────────────────────────────────────────────
const defaultBatches = [
  {
    id: 'batch-01', blockchain_id: 101, status: 'Tránsito',
    escrow_value: '45000.00', last_tx_hash: '0xabc123...789',
    description: 'Contenedor de café verde con certificación orgánica en transporte marítimo.',
    created_at: '2026-05-10T08:00:00Z', origin: 'Bogotá, Colombia', destination: 'Barcelona, España',
    progress: 68, eta: '2026-05-24',
  },
  {
    id: 'batch-02', blockchain_id: 102, status: 'Entregado',
    escrow_value: '32000.50', last_tx_hash: '0xdef456...012',
    description: 'Repuestos electrónicos con seguro de transporte y control de inventario.',
    created_at: '2026-05-11T10:30:00Z', origin: 'Shenzhen, China', destination: 'Madrid, España',
    progress: 100, eta: '2026-05-15',
  },
  {
    id: 'batch-03', blockchain_id: 103, status: 'Disputa',
    escrow_value: '21500.75', last_tx_hash: '0xghi789...345',
    description: 'Carga premium de vinos con trazabilidad de temperatura y etiquetas IPFS.',
    created_at: '2026-05-12T12:15:00Z', origin: 'Mendoza, Argentina', destination: 'Nueva York, EEUU',
    progress: 45, eta: '2026-05-28',
  }
];

const defaultTimelineEvents = [
  { id: 1, date: '2026-05-14 08:30', eventName: 'Origen de carga', tx_hash: '0xabc123...789', latitude: -34.6037, longitude: -58.3816, stage: 'origin', type: 'created', actor: 'Exportador' },
  { id: 2, date: '2026-05-14 15:20', eventName: 'Paso por centro logístico', tx_hash: '0xdef456...012', latitude: -34.7017, longitude: -58.4783, stage: 'intermediate', type: 'transit', actor: 'Logística' },
  { id: 3, date: '2026-05-15 09:45', eventName: 'Destino final', tx_hash: '0xghi789...345', latitude: -34.5973, longitude: -58.3810, stage: 'destination', type: 'approved', actor: 'Aduana' }
];

const defaultSensorLogs = [
  { timestamp: '2026-05-15T10:00:00Z', value: 5.2 },
  { timestamp: '2026-05-15T12:00:00Z', value: 5.8 },
  { timestamp: '2026-05-15T14:00:00Z', value: 6.5 },
  { timestamp: '2026-05-15T16:00:00Z', value: 5.9 }
];

const statusConfig = {
  Tránsito: { border: 'border-cyan-500', text: 'text-cyan-300', bg: 'bg-cyan-500/10', dot: 'bg-cyan-400', icon: Truck },
  Entregado: { border: 'border-emerald-500', text: 'text-emerald-300', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400', icon: CheckCircle2 },
  Disputa: { border: 'border-rose-500', text: 'text-rose-300', bg: 'bg-rose-500/10', dot: 'bg-rose-400', icon: AlertTriangle },
};

function StatusBadge({ status, small }) {
  const cfg = statusConfig[status] || {};
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${cfg.border || 'border-slate-700'} ${cfg.text || 'text-slate-300'} ${cfg.bg || 'bg-slate-800'} ${small ? 'text-[11px] px-2 py-0.5' : ''}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot || 'bg-slate-400'} animate-pulse`} />
      {status}
    </span>
  );
}

function Card({ children, className = '' }) {
  return <div className={`rounded-2xl border border-slate-800 bg-slate-900 ${className}`}>{children}</div>;
}

function SectionTitle({ children, sub }) {
  return (
    <div className="mb-6">
      <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">{sub}</p>
      <h2 className="mt-1 text-xl font-semibold text-white">{children}</h2>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL UNIFICADO ──────────────────────────────────────────
export default function DashboardPage() {
  // Integración Web3 real desde tu custom hook original
  const { userAddress, signer, error: web3Error, connectWallet, getContractInstance } = useWeb3();
  const navigate = useNavigate();

  const [view, setView] = useState('dashboard'); 
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [batches, setBatches] = useState(defaultBatches);
  const [sensorData, setSensorData] = useState(defaultSensorLogs);
  const [batchEvents, setBatchEvents] = useState(defaultTimelineEvents);
  
  const [contractMessage, setContractMessage] = useState('');
  const [contractLoading, setContractLoading] = useState(false);
  const [uiFeedback, setUiFeedback] = useState(null);

  const [filterStatus, setFilterStatus] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [batchesRes, telemetryRes, eventsRes] = await Promise.all([
          fetch('/api/batches').catch(() => null),
          fetch('/api/sensor_logs').catch(() => null),
          fetch('/api/batch_events').catch(() => null),
        ]);

        if (batchesRes && batchesRes.ok) {
          const bData = await batchesRes.json();
          if (bData && bData.length > 0) setBatches(bData);
        }
        if (telemetryRes && telemetryRes.ok) setSensorData(await telemetryRes.json());
        if (eventsRes && eventsRes.ok) setBatchEvents(await eventsRes.json());
      } catch (err) {
        setUiFeedback('Sincronizando con fallbacks. Error de pasarela de red.');
      }
    };
    loadDashboardData();
  }, []);

  // ─── INTERACCIONES SMART CONTRACT REALES ───────────────────────────────────
  const handleReleasePayment = async () => {
    if (!userAddress) {
      setContractMessage('⚠ Conecta tu wallet primero.');
      return;
    }
    if (!selectedBatch || !selectedBatch.blockchain_id) {
      setContractMessage('⚠ Lote seleccionado sin ID de asignación blockchain.');
      return;
    }

    setContractLoading(true);
    setContractMessage('Procesando liberación de fondos en Blockchain...');
    try {
      const contract = getContractInstance(ESCROW_CONTRACT_ADDRESS, ESCROW_CONTRACT_ABI);
      const tx = await contract.liberarPago(selectedBatch.blockchain_id);
      setContractMessage('Transacción enviada. Esperando confirmación...');
      await tx.wait();
      setContractMessage(`✓ Pago liberado con éxito para el lote #${selectedBatch.id}.`);
    } catch (err) {
      setContractMessage(`✗ Error: ${err?.reason || err?.message || 'Rechazado.'}`);
    } finally {
      setContractLoading(false);
    }
  };

  const handleOpenDispute = async () => {
    if (!userAddress) {
      setContractMessage('⚠ Conecta tu wallet primero.');
      return;
    }
    if (!selectedBatch || !selectedBatch.blockchain_id) {
      setContractMessage('⚠ Lote seleccionado sin ID de asignación blockchain.');
      return;
    }

    setContractLoading(true);
    setContractMessage('Abriendo disputa en el contrato de depósito...');
    try {
      const contract = getContractInstance(ESCROW_CONTRACT_ADDRESS, ESCROW_CONTRACT_ABI);
      const reason = `Métricas IoT comprometidas en el lote ${selectedBatch.id}`;
      const tx = await contract.abrirDisputa(selectedBatch.blockchain_id, reason);
      setContractMessage('Transacción en proceso... Esperando validación...');
      await tx.wait();
      setContractMessage('✓ Estado de disputa guardado en blockchain de forma segura.');
    } catch (err) {
      setContractMessage(`✗ Error: ${err?.reason || err?.message || 'Rechazado.'}`);
    } finally {
      setContractLoading(false);
    }
  };

  const totalEscrow = useMemo(() => batches.reduce((t, b) => t + Number(b.escrow_value || 0), 0), [batches]);
  const statusOptions = ['Todos', 'Tránsito', 'Entregado', 'Disputa'];

  const filteredBatches = useMemo(() => batches.filter(b => {
    const ms = filterStatus === 'Todos' || b.status === filterStatus;
    const mt = [b.id, b.description || '', b.last_tx_hash || ''].join(' ').toLowerCase().includes(searchTerm.toLowerCase());
    return ms && mt;
  }), [batches, filterStatus, searchTerm]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-400 selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-900 bg-slate-950 p-4 transition-transform lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg">
            <Box className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">TRUSTCHAIN</h1>
            <p className="text-[10px] font-medium text-cyan-400/80 tracking-widest">ESCROW v1.0</p>
          </div>
        </div>

        <nav className="mt-8 flex-1 space-y-1">
          {['dashboard', 'admin'].map(viewKey => (
            <button
              key={viewKey}
              onClick={() => { setView(viewKey); setSidebarOpen(false); }}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-xs font-medium transition capitalize ${view === viewKey ? 'bg-gradient-to-r from-cyan-500/10 to-transparent text-cyan-400 border-l-2 border-cyan-500' : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'}`}
            >
              <Filter className="h-4 w-4" />
              {viewKey === 'dashboard' ? 'Dashboard General' : 'Control de Roles'}
            </button>
          ))}
        </nav>

        <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-3">
          {userAddress ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono">Wallet Activa</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="truncate text-xs font-mono text-slate-200 bg-slate-950 p-2 rounded-md border border-slate-800">
                {userAddress}
              </p>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 text-xs font-semibold text-white shadow-md hover:opacity-95 transition"
            >
              <Zap className="h-3.5 w-3.5" /> Conectar Wallet
            </button>
          )}
          {web3Error && <p className="mt-2 text-[11px] text-rose-400 text-center">{web3Error}</p>}
          {uiFeedback && <p className="mt-2 text-[10px] text-amber-500 text-center font-mono">{uiFeedback}</p>}
        </div>
      </aside>

      {/* COMPONENTE DE PANTALLA DERECHA */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-slate-900 bg-slate-950/50 px-4 backdrop-blur-md lg:px-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-900 lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-500">SISTEMA</p>
              <h1 className="text-base font-semibold text-white">
                {view === 'batch' && selectedBatch ? `Detalles del lote: ${selectedBatch.id}` : 'Mesa de Control Geral'}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onLogout?.();
                navigate('/', { replace: true });
              }}
              className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto px-4 py-6 lg:px-6">
          <div className="mx-auto max-w-5xl">
            
            {view === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {[
                    { label: 'Valor en Escrow', value: totalEscrow.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), icon: DollarSign, color: 'text-emerald-400' },
                    { label: 'Lotes Totales', value: batches.length, icon: Package, color: 'text-cyan-400' },
                    { label: 'En Tránsito', value: batches.filter(b => b.status === 'Tránsito').length, icon: Truck, color: 'text-blue-400' },
                    { label: 'En Disputa', value: batches.filter(b => b.status === 'Disputa').length, icon: AlertTriangle, color: 'text-rose-400' },
                  ].map(s => (
                    <Card key={s.label} className="p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{s.label}</p>
                          <p className="mt-3 text-2xl font-semibold text-white">{s.value}</p>
                        </div>
                        <s.icon className={`h-5 w-5 ${s.color} mt-1`} />
                      </div>
                    </Card>
                  ))}
                </div>

                <Card className="p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <input
                      type="search"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Filtrar por ID, origen o descripción..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 px-4 text-sm text-slate-200 outline-none focus:border-cyan-500"
                    />
                    <div className="flex gap-2">
                      {statusOptions.map(opt => (
                        <button key={opt} onClick={() => setFilterStatus(opt)}
                          className={`rounded-xl border px-4 py-2.5 text-xs font-medium transition ${filterStatus === opt ? 'border-cyan-500 bg-cyan-500/15 text-cyan-300' : 'border-slate-700 text-slate-400 hover:text-white'}`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </Card>

                <div className="grid gap-4">
                  {filteredBatches.map(batch => (
                    <button key={batch.id} onClick={() => { setSelectedBatch(batch); setView('batch'); }}
                      className="w-full text-left rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-cyan-500/50">
                      <div className="flex justify-between gap-4">
                        <div>
                          <StatusBadge status={batch.status} />
                          <span className="ml-3 text-xs text-slate-600">Blockchain ID: #{batch.blockchain_id || 'N/A'}</span>
                          <h3 className="mt-3 text-base font-medium text-white">{batch.description}</h3>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-semibold text-white">${Number(batch.escrow_value).toLocaleString()}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {view === 'batch' && selectedBatch && (
              <div className="space-y-6">
                <button onClick={() => setView('dashboard')} className="text-xs text-slate-500 hover:text-cyan-400 transition">
                  ← Volver al Dashboard General
                </button>

                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="space-y-6 lg:col-span-1">
                    <Card className="p-5 space-y-4">
                      <StatusBadge status={selectedBatch.status} />
                      <h3 className="text-lg font-semibold text-white">Lote: {selectedBatch.id}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">{selectedBatch.description}</p>
                    </Card>

                    <Card className="p-5 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-cyan-400" /> Operaciones Escrow
                      </h4>
                      <div className="flex flex-col gap-2 pt-2">
                        <button 
                          onClick={handleReleasePayment} 
                          disabled={contractLoading}
                          className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-40 transition"
                        >
                          {contractLoading ? 'Procesando firma...' : 'Confirmar Recepción y Liberar'}
                        </button>
                        <button 
                          onClick={handleOpenDispute} 
                          disabled={contractLoading}
                          className="w-full rounded-xl bg-rose-500/10 border border-rose-500/30 py-3 text-xs font-bold text-rose-400 hover:bg-rose-500/20 disabled:opacity-40 transition"
                        >
                          Abrir Disputa Arbitral
                        </button>
                      </div>
                      {contractMessage && (
                        <p className="text-[11px] bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-cyan-400 text-center">
                          {contractMessage}
                        </p>
                      )}
                    </Card>
                  </div>

                  <div className="space-y-6 lg:col-span-2">
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                      <h2 className="flex items-center text-sm font-semibold mb-4 text-slate-100 uppercase tracking-wider">
                        <Thermometer className="mr-2 h-4 w-4 text-cyan-400"/> Telemetría IoT en Directo
                      </h2>
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <BatchTelemetryChart data={sensorData} />
                      </div>
                    </div>

                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                      <h2 className="flex items-center text-sm font-semibold mb-4 text-slate-100 uppercase tracking-wider">
                        <MapPin className="mr-2 h-4 w-4 text-cyan-400"/> Ruta Crítica del Contenedor
                      </h2>
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <BatchRouteMap events={batchEvents} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {view === 'admin' && (
              <Card className="p-6">
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-white">Gobernanza del Sistema</h3>
                  <p className="text-xs text-slate-500">Firmantes autorizados en multi-escrow.</p>
                </div>
                <div className="divide-y divide-slate-800 font-mono text-xs">
                  <div className="flex justify-between py-2 text-slate-300">
                    <span>María García (Admin)</span>
                    <span>0x1a2b...3c4d</span>
                  </div>
                  <div className="flex justify-between py-2 text-slate-300">
                    <span>Carlos López (Exportador)</span>
                    <span>0x5e6f...7g8h</span>
                  </div>
                </div>
              </Card>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}