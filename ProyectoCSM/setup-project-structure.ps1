# PowerShell script para inicializar la estructura 3-Tier de ProyectoCSM
# Ejecutar desde la carpeta raíz ProyectoCSM:
#   .\setup-project-structure.ps1

$Root = (Get-Location).Path
Write-Host "Inicializando estructura en: $Root"

$folders = @(
    'contracts/contracts',
    'contracts/scripts',
    'contracts/test',
    'backend/src/routes',
    'backend/src/controllers',
    'backend/src/models',
    'frontend/src/components',
    'frontend/src/hooks',
    'frontend/src/services'
)

foreach ($folder in $folders) {
    $path = Join-Path $Root $folder
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
        Write-Host "Creado: $path"
    } else {
        Write-Host "Existe: $path"
    }
}

$files = @{
    'contracts/hardhat.config.js' = @'
require('@nomicfoundation/hardhat-toolbox');

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: '0.8.20',
  paths: {
    sources: 'contracts/contracts',
    tests: 'contracts/test',
    scripts: 'contracts/scripts',
  },
  networks: {
    hardhat: {},
  },
};
'@;

    'backend/package.json' = @'
{
  "name": "proyectocsm-backend",
  "version": "0.1.0",
  "private": true,
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
'@;

    'backend/index.js' = @'
const express = require('express');
const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', component: 'backend' });
});

app.listen(port, () => {
  console.log(`API backend escuchando en http://localhost:${port}`);
});
'@;

    'frontend/package.json' = @'
{
  "name": "proyectocsm-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1"
  },
  "browserslist": {
    "production": [">0.2%", "not dead", "not op_mini all"],
    "development": ["last 1 chrome version", "last 1 firefox version", "last 1 safari version"]
  }
}
'@;

    'frontend/src/App.js' = @'
import React from 'react';

function App() {
  return (
    <div>
      <h1>ProyectoCSM Frontend</h1>
      <p>Arquitectura 3-Tier: Frontend React</p>
    </div>
  );
}

export default App;
'@;

    'frontend/src/index.js' = @'
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
'@;

    'frontend/src/components/Dashboard.js' = @'
import React from 'react';

const Dashboard = () => {
  return <div>Dashboard de trazabilidad</div>;
};

export default Dashboard;
'@;

    'frontend/src/hooks/useWeb3.js' = @'
import { useState } from 'react';

const useWeb3 = () => {
  const [account, setAccount] = useState(null);
  return { account, setAccount };
};

export default useWeb3;
'@;

    'frontend/src/services/api.js' = @'
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export const fetchHealth = async () => {
  const response = await fetch(`${API_BASE}/health`);
  return response.json();
};
'@;
}

foreach ($relativePath in $files.Keys) {
    $fullPath = Join-Path $Root $relativePath
    $directory = Split-Path $fullPath -Parent
    if (-not (Test-Path $directory)) {
        New-Item -ItemType Directory -Path $directory -Force | Out-Null
    }
    if (-not (Test-Path $fullPath)) {
        $files[$relativePath] | Set-Content -Path $fullPath -Force -Encoding UTF8
        Write-Host "Creado: $fullPath"
    } else {
        Write-Host "Ya existe: $fullPath"
    }
}

Write-Host "Estructura 3-Tier generada. Ejecuta 'npm install' en backend y frontend para completar."