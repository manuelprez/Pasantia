import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Thermometer, ShieldCheck, Box } from 'lucide-react';
import useWeb3 from './hooks/useWeb3';
import BatchTelemetryChart from './BatchTelemetryChart';
import BatchRouteMap from './BatchRouteMap';

// Datos simulados de telemetría (sensor_logs)
const defaultSensorData = [
  { timestamp: '2026-05-15T10:00:00Z', value: 5.2 },
  { timestamp: '2026-05-15T12:00:00Z', value: 5.8 },
  { timestamp: '2026-05-15T14:00:00Z', value: 6.5 },
  { timestamp: '2026-05-15T16:00:00Z', value: 5.9 },
];

const defaultBatchEvents = [
  {
    eventName: 'Origen de carga',
    timestamp: '2026-05-14T08:30:00Z',
    tx_hash: '0xabc123...789',
    latitude: -34.6037,
    longitude: -58.3816,
    stage: 'origin',
  },
  {
    eventName: 'Paso por centro logístico',
    timestamp: '2026-05-14T15:20:00Z',
    tx_hash: '0xdef456...012',
    latitude: -34.7017,
    longitude: -58.4783,
    stage: 'intermediate',
  },
  {
    eventName: 'Destino final',
    timestamp: '2026-05-15T09:45:00Z',
    tx_hash: '0xghi789...345',
    latitude: -34.5973,
    longitude: -58.3810,
    stage: 'destination',
  },
];

const Dashboard = () => {
  const { userAddress, signer, error, connectWallet, getContractInstance } = useWeb3();
  const [contractMessage, setContractMessage] = useState('');
  const [sensorData, setSensorData] = useState(defaultSensorData);
  const [batchEvents, setBatchEvents] = useState(defaultBatchEvents);
  const [dataError, setDataError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [telemetryRes, eventsRes] = await Promise.all([
          fetch('/api/sensor_logs'),
          fetch('/api/batch_events'),
        ]);

        if (!telemetryRes.ok || !eventsRes.ok) {
          throw new Error('Error al cargar datos desde el backend.');
        }

        const [telemetryData, eventsData] = await Promise.all([
          telemetryRes.json(),
          eventsRes.json(),
        ]);

        setSensorData(telemetryData);
        setBatchEvents(eventsData);
      } catch (err) {
        setDataError(err.message || 'No se pudieron obtener los datos del backend.');
      }
    };

    loadDashboardData();
  }, []);

  const ESCROW_CONTRACT_ADDRESS = '0xAaBbCcDdEeFf0011223344556677889900aAbBc';
  const ESCROW_CONTRACT_ABI = [
    {
      name: 'releasePayment',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [],
      outputs: [],
    },
    {
      name: 'openDispute',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [],
      outputs: [],
    },
  ];

  const handleReleasePayment = async () => {
    try {
      const contract = getContractInstance(ESCROW_CONTRACT_ADDRESS, ESCROW_CONTRACT_ABI);
      const tx = await contract.releasePayment();
      await tx.wait();
      setContractMessage('Pago liberado correctamente.');
    } catch (err) {
      setContractMessage(err?.message || 'Error al liberar el pago.');
    }
  };

  const handleOpenDispute = async () => {
    try {
      const contract = getContractInstance(ESCROW_CONTRACT_ADDRESS, ESCROW_CONTRACT_ABI);
      const tx = await contract.openDispute();
      await tx.wait();
      setContractMessage('Disputa abierta correctamente.');
    } catch (err) {
      setContractMessage(err?.message || 'Error al abrir la disputa.');
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">CommodityChain Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {userAddress
              ? `Wallet conectada: ${userAddress.substring(0, 6)}...${userAddress.slice(-4)}`
              : 'Conecta tu wallet para habilitar las funciones Web3.'}
          </p>
        </div>
        <div className="flex space-x-4">
          <button 
            onClick={connectWallet}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            {userAddress ? 'Revisar Conexión' : 'Connect Wallet'}
          </button>
          <button 
            onClick={() => navigate('/')}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
      </div>
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4 text-red-700">
          {error}
        </div>
      )}
      {dataError && (
        <div className="mb-4 rounded-xl bg-yellow-50 border border-yellow-200 p-4 text-yellow-700">
          {dataError}
        </div>
      )}
      {contractMessage && (
        <div className="mb-4 rounded-xl bg-blue-50 border border-blue-200 p-4 text-blue-700">
          {contractMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna Izquierda: Detalles e Integridad */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="flex items-center text-lg font-semibold mb-4"><Box className="mr-2"/> Status del Lote</h2>
            <div className="space-y-3">
              <p className="text-sm text-gray-500">ID Blockchain: <span className="text-black font-mono">0x44a2...9b1</span></p>
              <p className="text-sm text-gray-500">Estado: <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">IN TRANSIT</span></p>
              <p className="text-sm text-gray-500">Escrow: <span className="text-black font-bold">45,000.00 USDC</span></p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-blue-500">
            <h2 className="flex items-center text-lg font-semibold mb-4"><ShieldCheck className="mr-2"/> Certificados IPFS</h2>
            <ul className="text-sm space-y-2">
              <li className="text-blue-600 underline cursor-pointer">Certificado_Origen.pdf</li>
              <li className="text-blue-600 underline cursor-pointer">Analisis_Calidad.pdf</li>
            </ul>
          </div>
        </div>

        {/* Columna Central y Derecha: Visualización de Datos */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Gráfico de Telemetría */}
          <div className="bg-slate-950 p-6 rounded-3xl shadow-xl border border-slate-800">
            <h2 className="flex items-center text-lg font-semibold mb-4 text-slate-100"><Thermometer className="mr-2"/> Control de Temperatura (IoT)</h2>
              <BatchTelemetryChart data={sensorData} />
          </div>

          {/* Mapa de Navegación del Proceso */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="flex items-center text-lg font-semibold mb-4"><MapPin className="mr-2"/> Trazabilidad en Tiempo Real</h2>
            <BatchRouteMap events={batchEvents} />
          </div>

          {/* Acciones del Smart Contract */}
          <div className="flex gap-4">
            <button className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-green-700">
              Confirmar Recepción (Liberar Pago)
            </button>
            <button className="flex-1 bg-red-100 text-red-600 py-3 rounded-xl font-bold hover:bg-red-200">
              Abrir Disputa
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;