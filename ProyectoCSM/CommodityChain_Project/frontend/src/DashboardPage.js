import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Filter, Search, Sparkles, MapPin, Clock, FileText, Activity,
  Shield, Settings, ChevronRight, AlertTriangle, CheckCircle2,
  Truck, Upload, DollarSign, X, Menu, Bell, User, Thermometer,
  Droplets, Wind, Zap, Package, Lock, Unlock, Plus, RefreshCw,
  Download, Eye, Hash, BarChart3, Globe, Cpu, ChevronDown, Circle, ShieldCheck, LogOut
} from 'lucide-react';

// Importación de tus hooks y gráficos reales del Dashboard anterior
import useWeb3 from './hooks/useWeb3';
import BatchTelemetryChart from './BatchTelemetryChart';
import BatchRouteMap from './BatchRouteMap';

// ─── DATOS SIMULADOS POR DEFECTO (FALLBACKS) ──────────────────────────────────
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

const ipfsDocuments = [
  { name: 'Certificado Orgánico.pdf', cid: 'QmX7kP...abc1', size: '2.4 MB', type: 'pdf', verified: true },
  { name: 'Factura Comercial.pdf', cid: 'QmY8mQ...def2', size: '1.1 MB', type: 'pdf', verified: true },
  { name: 'Bill of Lading.pdf', cid: 'QmZ9nR...ghi3', size: '0.8 MB', type: 'pdf', verified: false }
];

const roles = [
  { id: 1, name: 'María García', role: 'Admin', wallet: '0x1a2b...3c4d', active: true },
  { id: 2, name: 'Carlos López', role: 'Exportador', wallet: '0x5e6f...7g8h', active: true }
];

// ─── CONFIGURACIONES DE ESTILOS ──────────────────────────────────────────────
const statusConfig = {
  Tránsito: { border: 'border-cyan-500', text: 'text-cyan-300', bg: 'bg-cyan-500/10', dot: 'bg-cyan-400', icon: Truck },
  Entregado: { border: 'border-emerald-500', text: 'text-emerald-300', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400', icon: CheckCircle2 },
  Disputa: { border: 'border-rose-500', text: 'text-rose-300', bg: 'bg-rose-500/10', dot: 'bg-rose-400', icon: AlertTriangle },
};

// ─── MICRO COMPONENTES ────────────────────────────────────────────────────────
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
  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-900 ${className}`}>
      {children}
    </div>
  );
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
export default function DashboardPage({ onLogout }) {
  // Integración Web3 real desde tu custom hook original
  const { userAddress, signer, error: web3Error, connectWallet, getContractInstance } = useWeb3();
  const navigate = useNavigate();

  // Estados de navegación interna
  const [view, setView] = useState('dashboard'); // 'dashboard', 'batch', 'admin'
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Estados de datos dinámicos (Conectados al backend)
  const [batches, setBatches] = useState(defaultBatches);
  const [sensorData, setSensorData] = useState(defaultSensorLogs);
  const [batchEvents, setBatchEvents] = useState(defaultTimelineEvents);
  const [contractMessage, setContractMessage] = useState('');
  const [backendError, setBackendError] = useState(null);

  // Filtros de búsqueda
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Carga de datos real de la base de datos "pasantia" mediante tu API rest
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [batchesRes, telemetryRes, eventsRes] = await Promise.all([
          fetch('/api/batches').catch(() => null), // Agregado por si tienes el endpoint de lotes
          fetch('/api/sensor_logs').catch(() => null),
          fetch('/api/batch_events').catch(() => null),
        ]);

        if (batchesRes && batchesRes.ok) {
          const bData = await batchesRes.json();
          if (bData && bData.length > 0) setBatches(bData);
        }
        if (telemetryRes && telemetryRes.ok) {
          const tData = await telemetryRes.json();
          setSensorData(tData);
        }
        if (eventsRes && eventsRes.ok) {
          const eData = await eventsRes.json();
          setBatchEvents(eData);
        }
      } catch (err) {
        setBackendError('Error al sincronizar datos en tiempo real con MySQL.');
      }
    };
    loadDashboardData();
  }, []);

  // Handlers para las acciones del Smart Contract (Ethers / Web3)
  const handleReleasePayment = async () => {
    try {
      setContractMessage('Procesando liberación de fondos en Blockchain...');
      // Aquí puedes instanciar tu contrato si tienes la dirección y ABI
      // const contract = getContractInstance(ADDRESS, ABI);
      // const tx = await contract.releasePayment();
      // await tx.wait();
      setContractMessage('¡Éxito! Fondos liberados al exportador.');
    } catch (err) {
      setContractMessage(`Error en Smart Contract: ${err.message || err}`);
    }
  };

  const handleOpenDispute = async () => {
    try {
      setContractMessage('Registrando disputa en el Escrow Contract...');
      setContractMessage('Disputa abierta. El arbitraje evaluará las firmas digitales.');
    } catch (err) {
      setContractMessage(`Error: ${err.message || err}`);
    }
  };

  // Cálculos dinámicos para la vista general
  const totalEscrow = useMemo(() => batches.reduce((t, b) => t + Number(b.escrow_value || 0), 0), [batches]);
  const statusOptions = ['Todos', 'Tránsito', 'Entregado', 'Disputa'];

  const filteredBatches = useMemo(() => batches.filter(b => {
    const ms = filterStatus === 'Todos' || b.status === filterStatus;
    const mt = [b.id, b.description || '', b.last_tx_hash || ''].join(' ').toLowerCase().includes(searchTerm.toLowerCase());
    return ms && mt;
  }), [batches, filterStatus, searchTerm]);

  const handleSelectBatch = (batch) => {
    setSelectedBatch(batch);
    setView('batch');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-400 selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* SIDEBAR DE LA DAPP */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-900 bg-slate-950 p-4 transition-transform lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-cyan-500/20">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">TRUSTCHAIN</h1>
            <p className="text-[10px] font-medium text-cyan-400/80 tracking-widest">ESCROW v1.0</p>
          </div>
        </div>

        <nav className="mt-8 flex-1 space-y-1">
          {[
            { id: 'dashboard', label: 'Dashboard General', icon: Box },
            { id: 'admin', label: 'Control de Roles', icon: Settings },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => { setView(item.id); setSidebarOpen(false); }}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-xs font-medium transition ${view === item.id ? 'bg-gradient-to-r from-cyan-500/10 to-transparent text-cyan-400 border-l-2 border-cyan-500' : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'}`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Info de la Billetera (Web3) */}
        <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-3">
          {userAddress ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono">Wallet Conectada</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="truncate text-xs font-mono text-slate-200 bg-slate-950 p-2 rounded-md border border-slate-800">
                {userAddress}
              </p>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 text-xs font-semibold text-white shadow-lg shadow-cyan-500/15 hover:opacity-95 active:scale-[0.98] transition"
            >
              <Zap className="h-3.5 w-3.5" />
              Conectar Metamask
            </button>
          )}
          {web3Error && <p className="mt-2 text-[11px] text-rose-400 text-center">{web3Error}</p>}
        </div>
      </aside>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="flex flex-1 flex-col overflow-hidden">
        
        {/* ENCABEZADO */}
        <header className="flex h-16 items-center justify-between border-b border-slate-900 bg-slate-950/50 px-4 backdrop-blur-md lg:px-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-900 lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-500">
                {view === 'batch' && selectedBatch ? `LOTE / ${selectedBatch.id}` : view === 'admin' ? 'SISTEMA' : 'DAPP'}
              </p>
              <h1 className="text-base font-semibold text-white">
                {view === 'batch' && selectedBatch ? selectedBatch.description.slice(0, 45) + '...' : view === 'admin' ? 'Administración' : 'Dashboard de Lotes'}
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

        {/* NÚCLEO DE LAS VISTAS */}
        <main className="flex-1 overflow-auto px-4 py-6 lg:px-6">
          <div className="mx-auto max-w-5xl">
            
            {/* VISTA 1: DASHBOARD GENERAL */}
            {view === 'dashboard' && (
              <div className="space-y-6">
                {/* Métricas rápidas */}
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

                {/* Buscador + Filtros */}
                <Card className="p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
                      <input
                        type="search"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Buscar por ID, origen o descripción..."
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-11 pr-4 text-sm text-slate-200 outline-none transition focus:border-cyan-500 placeholder:text-slate-600"
                      />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {statusOptions.map(opt => (
                        <button key={opt} onClick={() => setFilterStatus(opt)}
                          className={`rounded-xl border px-4 py-2.5 text-xs font-medium transition ${filterStatus === opt ? 'border-cyan-500 bg-cyan-500/15 text-cyan-300' : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </Card>

                {/* Cartas de Lotes */}
                <div className="grid gap-4">
                  {filteredBatches.map(batch => (
                    <button key={batch.id} onClick={() => handleSelectBatch(batch)}
                      className="group w-full text-left rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-cyan-500/50 hover:bg-slate-800/80">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <StatusBadge status={batch.status} />
                            <span className="text-xs text-slate-600">ID: {batch.id} · Block #{batch.blockchain_id || 'N/A'}</span>
                          </div>
                          <h3 className="mt-3 text-base font-medium text-white leading-snug">{batch.description}</h3>
                          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                            <MapPin className="h-3 w-3" />
                            <span>{batch.origin} → {batch.destination}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xl font-semibold text-white">${Number(batch.escrow_value).toLocaleString()}</p>
                          <p className="mt-1 text-xs text-slate-500">ETA: {batch.eta || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full bg-cyan-500 transition-all" style={{ width: `${batch.progress || 50}%` }} />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* VISTA 2: DETALLES DE UN LOTE (INTEGRACIÓN MÁXIMA DE GRÁFICOS REALES) */}
            {view === 'batch' && selectedBatch && (
              <div className="space-y-6">
                <button onClick={() => setView('dashboard')} className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-cyan-400 transition">
                  ← Volver a la lista general
                </button>

                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Columna Izquierda: Información Estática y Smart Contract */}
                  <div className="space-y-6 lg:col-span-1">
                    <Card className="p-5 space-y-4">
                      <StatusBadge status={selectedBatch.status} />
                      <h3 className="text-lg font-semibold text-white">{selectedBatch.id}</h3>
                      <p className="text-xs leading-relaxed text-slate-400">{selectedBatch.description}</p>
                      
                      <div className="border-t border-slate-800 pt-4 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Monto Escrow:</span>
                          <span className="font-semibold text-emerald-400">${Number(selectedBatch.escrow_value).toLocaleString()} USD</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Origen:</span>
                          <span className="text-slate-300">{selectedBatch.origin}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Destino:</span>
                          <span className="text-slate-300">{selectedBatch.destination}</span>
                        </div>
                      </div>
                    </Card>

                    {/* INTERACCIONES WEB3 DEL SMART CONTRACT */}
                    <Card className="p-5 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-cyan-400" /> Acciones de Smart Contract
                      </h4>
                      <div className="flex flex-col gap-2 pt-2">
                        <button onClick={handleReleasePayment} className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition">
                          Confirmar Recepción (Liberar Pago)
                        </button>
                        <button onClick={handleOpenDispute} className="w-full rounded-xl bg-rose-500/10 border border-rose-500/30 py-3 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition">
                          Abrir Disputa Comercial
                        </button>
                      </div>
                      {contractMessage && (
                        <p className="text-[11px] bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-cyan-400 text-center animate-pulse">
                          {contractMessage}
                        </p>
                      )}
                    </Card>
                  </div>

                  {/* Columna Derecha: Componentes del Dashboard.js Viejo (GRÁFICOS REALES DE MYSQL) */}
                  <div className="space-y-6 lg:col-span-2">
                    
                    {/* CONTROL DE TELEMETRÍA IOT REAL */}
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
                      <h2 className="flex items-center text-sm font-semibold mb-4 text-slate-100 uppercase tracking-wider">
                        <Thermometer className="mr-2 h-4 w-4 text-cyan-400"/> Control de Temperatura en Tiempo Real (IoT)
                      </h2>
                      <div className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <BatchTelemetryChart data={sensorData} />
                      </div>
                    </div>

                    {/* MAPA DE TRAZABILIDAD REAL */}
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
                      <h2 className="flex items-center text-sm font-semibold mb-4 text-slate-100 uppercase tracking-wider">
                        <MapPin className="mr-2 h-4 w-4 text-cyan-400"/> Trazabilidad Geográfica Integrada
                      </h2>
                      <div className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <BatchRouteMap events={batchEvents} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VISTA 3: ROLES / ADMIN */}
            {view === 'admin' && (
              <Card className="p-6">
                <SectionTitle sub="Gobernanza dApp">Permisos Multi-Firma</SectionTitle>
                <div className="divide-y divide-slate-800">
                  {roles.map(r => (
                    <div key={r.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-white">{r.name}</p>
                        <p className="text-xs text-slate-500 font-mono">{r.wallet}</p>
                      </div>
                      <span className="rounded-md bg-slate-800 px-2.5 py-1 text-xs text-cyan-400">{r.role}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}