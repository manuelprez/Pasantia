import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, Filter, Search, Sparkles } from 'lucide-react';

const defaultBatches = [
  {
    id: 'batch-01',
    blockchain_id: 101,
    status: 'Tránsito',
    escrow_value: '45000.00',
    last_tx_hash: '0xabc123...789',
    description: 'Contenedor de café verde con certificación orgánica en transporte marítimo.',
    created_at: '2026-05-10T08:00:00Z',
  },
  {
    id: 'batch-02',
    blockchain_id: 102,
    status: 'Entregado',
    escrow_value: '32000.50',
    last_tx_hash: '0xdef456...012',
    description: 'Repuestos electrónicos con seguro de transporte y control de inventario.',
    created_at: '2026-05-11T10:30:00Z',
  },
  {
    id: 'batch-03',
    blockchain_id: 103,
    status: 'Disputa',
    escrow_value: '21500.75',
    last_tx_hash: '0xghi789...345',
    description: 'Carga premium de vinos con trazabilidad de temperatura y etiquetas IPFS.',
    created_at: '2026-05-12T12:15:00Z',
  },
];

const statusOptions = ['Todos', 'Tránsito', 'Entregado', 'Disputa'];

const statusClasses = {
  Tránsito: 'border-cyan-500 text-cyan-300 bg-cyan-500/10',
  Entregado: 'border-emerald-500 text-emerald-300 bg-emerald-500/10',
  Disputa: 'border-rose-500 text-rose-300 bg-rose-500/10',
};

const DashboardPage = () => {
  const [batches, setBatches] = useState(defaultBatches);
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    const loadBatches = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/batches');
        if (!response.ok) throw new Error('No se pudo cargar la lista de lotes.');
        const data = await response.json();
        setBatches(Array.isArray(data) ? data : defaultBatches);
      } catch (err) {
        setFetchError(err.message || 'Error al cargar los lotes.');
      } finally {
        setLoading(false);
      }
    };

    loadBatches();
  }, []);

  const totalEscrow = useMemo(() => {
    return batches.reduce((total, batch) => total + Number(batch.escrow_value || 0), 0);
  }, [batches]);

  const filteredBatches = useMemo(() => {
    return batches.filter((batch) => {
      const matchesStatus = filterStatus === 'Todos' || batch.status === filterStatus;
      const matchesSearch = [batch.id, batch.description, batch.last_tx_hash]
        .join(' ')
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [batches, filterStatus, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 lg:px-10">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-400/70">DApp de trazabilidad</p>
          <h1 className="mt-3 text-4xl font-semibold text-white">Dashboard de Lotes</h1>
          <p className="mt-3 max-w-2xl text-slate-400">Filtra, revisa y navega entre los lotes activos de la cadena de suministro.</p>
        </div>
        <button
          type="button"
          onClick={() => setSearchTerm('')}
          className="inline-flex items-center gap-2 rounded-3xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
        >
          <Sparkles className="h-5 w-5" /> Reiniciar filtros
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Valor en Escrow</p>
              <p className="mt-4 text-3xl font-semibold text-white">{totalEscrow.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Lotes activos</p>
              <p className="mt-4 text-3xl font-semibold text-white">{batches.length}</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Resultados</p>
              <p className="mt-4 text-3xl font-semibold text-white">{filteredBatches.length}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-slate-500" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por ID, descripción o hash..."
                  className="w-full rounded-3xl border border-slate-800 bg-slate-950 py-4 pl-12 pr-4 text-sm text-slate-200 outline-none transition focus:border-cyan-500"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFilterStatus(option)}
                    className={`rounded-full border px-4 py-2 text-sm transition ${filterStatus === option ? 'border-cyan-500 bg-cyan-500/15 text-cyan-200' : 'border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">Cargando lotes...</div>
          ) : fetchError ? (
            <div className="rounded-3xl border border-rose-500 bg-rose-500/10 p-6 text-rose-200">{fetchError}</div>
          ) : filteredBatches.length === 0 ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">No se encontraron lotes con estos filtros.</div>
          ) : (
            <div className="grid gap-4">
              {filteredBatches.map((batch) => (
                <Link
                  key={batch.id}
                  to={`/batch/${batch.id}`}
                  className="group block rounded-3xl border border-slate-800 bg-slate-900 p-5 transition hover:border-cyan-500 hover:bg-slate-800"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.24em] text-slate-500">{batch.status}</p>
                      <h2 className="mt-3 text-xl font-semibold text-white">{batch.description}</h2>
                      <p className="mt-3 text-sm text-slate-400">Blockchain ID: {batch.blockchain_id} · Tx: {batch.last_tx_hash}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold text-white">{Number(batch.escrow_value).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
                      <p className="mt-2 text-sm text-slate-500">Ver detalle</p>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-between gap-4 text-xs text-slate-500">
                    <span>ID: {batch.id}</span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-slate-400 transition group-hover:border-cyan-500 group-hover:text-cyan-300">Ver lote</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Resumen de activos</p>
            <p className="mt-3 text-2xl font-semibold text-white">{totalEscrow.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
            <p className="mt-2 text-sm text-slate-400">Valor total en Escrow calculado desde la tabla de batches.</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Tipos de estado</p>
            <div className="mt-4 space-y-3">
              {['Tránsito', 'Entregado', 'Disputa'].map((status) => (
                <div key={status} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
                  <span className="text-sm text-slate-300">{status}</span>
                  <span className={statusClasses[status] || 'text-slate-300'}>{batches.filter((item) => item.status === status).length}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
            <div className="flex items-center gap-3 text-slate-200">
              <Filter className="h-5 w-5 text-cyan-400" />
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Filtro aplicado</p>
                <p className="mt-1 text-sm text-slate-300">{filterStatus}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default DashboardPage;
