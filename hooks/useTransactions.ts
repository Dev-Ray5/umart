'use client';

import { useState, useEffect } from 'react';
import { get, post } from '@/lib/utils/fetcher';

export interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Transaction {
  id: string;
  buyerId: string;
  sellerId: string;
  reference: string;
  items: InvoiceItem[];
  shippingFee: number;
  platformFee: number;
  price: number;
  confirmed: boolean;
  withdrawn: boolean;
  date: any;
  createdAt: any;
}

interface UseTransactionsResult {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
}

export function useTransactions(action: 'purchase' | 'sale'): UseTransactionsResult {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await get<Transaction[]>(`/api/transactions?action=${action}`);
        setTransactions(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [action]);

  return { transactions, loading, error };
}

export function useTransaction(transactionId: string, action: 'purchase' | 'sale') {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await get<Transaction>(
          `/api/transactions?action=${action}&id=${transactionId}`
        );
        setTransaction(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch transaction');
      } finally {
        setLoading(false);
      }
    };

    fetchTransaction();
  }, [transactionId, action]);

  const confirmReceived = async () => {
    try {
      await post('/api/reference/confirm-value', { referenceId: transaction?.reference });
      const data = await get<Transaction>(
        `/api/transactions?action=${action}&id=${transactionId}`
      );
      setTransaction(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm receipt');
      throw err;
    }
  };

  return { transaction, loading, error, confirmReceived };
}

export function useCreatePayment() {
  const createPayment = async (productId: string, amount: number) => {
    try {
      const data = await post('/api/payment', { productId, amount });
      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create payment');
    }
  };

  return { createPayment };
}
