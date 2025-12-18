import { useContext } from 'react';
import { WalletSyncContext } from '../app/providers';

export const useWalletSync = () => useContext(WalletSyncContext);
