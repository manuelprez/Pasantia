import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Thermometer, Box } from 'lucide-react';
import useWeb3 from './hooks/useWeb3';
import BatchTelemetryChart from './BatchTelemetryChart';
import BatchRouteMap from './BatchRouteMap';
                                 
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

const defaultSensorData = [
  { timestamp: '2026-05-15T10:00:00Z', value: 5.2 },
  { timestamp: '2026-05-15T12:00:00Z', value: 5.8 },
  { timestamp: '2026-05-15T14:00:00Z', value: 6.5 },
  { timestamp: '2026-05-15T16:00:00Z', value: 5.9 }
];

const defaultBatchEvents = [
  { eventName: 'Origen de carga', timestamp: '2026-05-14T08:30:00Z', tx_hash: '0xabc123...789', latitude: -34.6037, longitude: -58.3816, stage: 'origin' },
  { eventName: 'Destino final', timestamp: '2026-05-15T09:45:00Z', tx_hash: '0xghi789...345', latitude: -34.5973, longitude: -58.3810, stage: 'destination' }
];

const Dashboard = () => {
  const { userAddress, error, connectWallet, getContractInstance } = useWeb3();
  const [contractMessage, setContractMessage] = useState('');
  const [contractLoading, setContractLoading] = useState(false);
  const [sensorData, setSensorData] = useState(defaultSensorData);
  const [batchEvents, setBatchEvents] = useState(defaultBatchEvents);
  const [dataError, setDataError] = useState(null);
  const navigate = useNavigate();

  const STATIC_BATCH_BLOCKCHAIN_ID = 101;

  useEffect(() => {
    let cancelled = false;
    const loadDashboardData = async () => {
      try {
        const [telemetryRes, eventsRes] = await Promise.all([
          fetch('/api/sensor_logs'),
          fetch('/api/batch_events'),
        ]);

        if (!telemetryRes.ok || !eventsRes.ok) throw new Error('Error de pasarela API.');

        const [tData, eData] = await Promise.all([telemetryRes.json(), eventsRes.json()]);
        if (!cancelled) {
          setSensorData(tData);
          setBatchEvents(eData);
        }
      } catch (err) {
        if (!cancelled) setDataError(err.message || 'Error de conexión MySQL.');
      }
    };
    loadDashboardData();
    return () => { cancelled = true; };
  }, []);

  const handleReleasePayment = async () => {
    if (!userAddress) {
      setContractMessage('⚠ Conecta tu wallet primero.');
      return;
    }
    setContractLoading(true);
    setContractMessage('Procesando liberación de fondos...');
    try {
      const contract = getContractInstance(ESCROW_CONTRACT_ADDRESS, ESCROW_CONTRACT_ABI);
      const tx = await contract.liberarPago(STATIC_BATCH_BLOCKCHAIN_ID);
      await tx.wait();
      setContractMessage('✓ Pago liberado en bloque correctamente.');
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
    setContractLoading(true);
    setContractMessage('Registrando disputa...');
    try {
      const contract = getContractInstance(ESCROW_CONTRACT_ADDRESS, ESCROW_CONTRACT_ABI);
      const tx = await contract.abrirDisputa(STATIC_BATCH_BLOCKCHAIN_ID, "Abierto desde Dashboard Legacy.");
      await tx.wait();
      setContractMessage('✓ Estado de disputa actualizado.');
    } catch (err) {
      setContractMessage(`✗ Error: ${err?.reason || err?.message || 'Rechazado.'}`);
    } finally {
      setContractLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans text-gray-700">
      <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Mesa de Pruebas Unitaria</h1>
          <p className="text-xs text-gray-400 font-mono">{userAddress || 'Desconectado'}</p>
        </div>
        <div className="flex space-x-2">
          <button onClick={connectWallet} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-semibold">
            {userAddress ? 'Conectado' : 'Conectar Wallet'}
          </button>
          <button onClick={() => navigate(-1)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-xs font-semibold">
            Regresar
          </button>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-xs">{error}</div>}
      {dataError && <div className="mb-4 p-3 bg-amber-100 text-amber-700 rounded-lg text-xs">{dataError}</div>}
      {contractMessage && <div className="mb-4 p-3 bg-blue-100 text-blue-700 rounded-lg text-xs font-mono">{contractMessage}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-gray-100 space-y-3">
          <h3 className="font-bold flex items-center text-sm"><Box className="mr-2 h-4 w-4"/> Acuerdo Estático</h3>
          <p className="text-xs">ID Blockchain Forzado: <span className="font-mono text-blue-600 font-bold">#{STATIC_BATCH_BLOCKCHAIN_ID}</span></p>
          <div className="pt-4 flex flex-col gap-2">
            <button onClick={handleReleasePayment} disabled={contractLoading} className="w-full bg-emerald-600 text-white py-2.5 rounded-lg text-xs font-bold disabled:opacity-40">
              Liberar Fondos Lote 101
            </button>
            <button onClick={handleOpenDispute} disabled={contractLoading} className="w-full bg-red-50 text-red-600 py-2.5 rounded-lg text-xs font-bold disabled:opacity-40">
              Abrir Disputa Lote 101
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <BatchTelemetryChart data={sensorData} />
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100">
            <BatchRouteMap events={batchEvents} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;