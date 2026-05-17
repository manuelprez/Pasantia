import { useCallback, useEffect, useState } from 'react';
import { BrowserProvider, Contract } from 'ethers';

const METAMASK_NOT_FOUND = 'MetaMask no está instalado. Instala MetaMask y recarga la página.';
const USER_REJECTED = 'Conexión rechazada por el usuario.';

const useWeb3 = () => {
  const [userAddress, setUserAddress] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [error, setError] = useState(null);

  const createProvider = useCallback(() => {
    return window.ethereum ? new BrowserProvider(window.ethereum) : null;
  }, []);

  const updateStateFromProvider = useCallback(async (browserProvider) => {
    const accounts = await browserProvider.send('eth_accounts', []);
    if (accounts.length === 0) {
      setUserAddress(null);
      setProvider(null);
      setSigner(null);
      return;
    }

    const signerInstance = await browserProvider.getSigner();
    setUserAddress(accounts[0]);
    setProvider(browserProvider);
    setSigner(signerInstance);
    setError(null);
  }, []);

  const connectWallet = useCallback(async () => {
    try {
      if (!window.ethereum) {
        throw new Error(METAMASK_NOT_FOUND);
      }

      const browserProvider = createProvider();
      const accounts = await browserProvider.send('eth_requestAccounts', []);
      if (!accounts || accounts.length === 0) {
        throw new Error('No se detectaron cuentas conectadas.');
      }

      const signerInstance = await browserProvider.getSigner();
      setUserAddress(accounts[0]);
      setProvider(browserProvider);
      setSigner(signerInstance);
      setError(null);
      return accounts[0];
    } catch (err) {
      const message = err?.code === 4001 || err?.name === 'UserRejectedRequestError'
        ? USER_REJECTED
        : err?.message || 'Error al conectar con MetaMask.';
      setError(message);
      setUserAddress(null);
      setProvider(null);
      setSigner(null);
      throw new Error(message);
    }
  }, [createProvider]);

  const getContractInstance = useCallback((contractAddress, contractAbi) => {
    if (!contractAddress || !contractAbi) {
      throw new Error('La dirección y el ABI del contrato son obligatorios.');
    }
    if (!provider) {
      throw new Error('Provider no disponible. Conecta la wallet primero.');
    }

    return new Contract(contractAddress, contractAbi, signer || provider);
  }, [provider, signer]);

  useEffect(() => {
    const initialize = async () => {
      try {
        if (!window.ethereum) {
          setError(METAMASK_NOT_FOUND);
          return;
        }

        const browserProvider = createProvider();
        await updateStateFromProvider(browserProvider);

        const handleAccountsChanged = (accounts) => {
          if (accounts.length === 0) {
            setUserAddress(null);
            setProvider(null);
            setSigner(null);
          } else {
            setUserAddress(accounts[0]);
          }
        };

        const handleChainChanged = () => {
          window.location.reload();
        };

        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);

        return () => {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        };
      } catch (err) {
        console.error('useWeb3 initialization error:', err);
      }
    };

    initialize();
  }, [createProvider, updateStateFromProvider]);

  return {
    userAddress,
    provider,
    signer,
    error,
    connectWallet,
    getContractInstance,
  };
};

export default useWeb3;
