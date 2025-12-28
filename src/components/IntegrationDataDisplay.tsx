'use client';

import { useState, useEffect } from 'react';
import { useWallets } from '@privy-io/react-auth';

interface IntegrationData {
  summary?: {
    total_revenue?: number;
    total_expenses?: number;
    customer_count?: number;
    profit_margin?: number;
  };
  invoices?: Array<{
    id: string;
    customer: string;
    amount: number;
    status: string;
    date: string;
  }>;
  expenses?: Array<{
    id: string;
    vendor: string;
    amount: number;
    category: string;
    date: string;
  }>;
  customers?: Array<{
    id: string;
    name: string;
    revenue: number;
    last_interaction: string;
  }>;
}

export function IntegrationDataDisplay({ integration }: { integration: string }) {
  const { wallets } = useWallets();
  const address = wallets?.[0]?.address;
  const [data, setData] = useState<IntegrationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;

    // Using mock data for demonstration
    const mockData = getMockIntegrationData(integration);
    setTimeout(() => {
      setData(mockData);
      setLoading(false);
    }, 500);

    // Uncomment when backend is ready:
    /*
    fetch(`/api/v1/integrations/${integration}/data?wallet=${address}`)
      .then(res => res.json())
      .then(setData)
      .catch((error) => logger.error('Failed to fetch integration data', error))
      .finally(() => setLoading(false));
    */
  }, [address, integration]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        <p className="text-gray-300 mt-4">Loading {integration} data...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-gray-400">
        No data available for {integration}
      </div>
    );
  }

  // QuickBooks specific display
  if (integration.toLowerCase() === 'quickbooks') {
    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        {data.summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
              <p className="text-sm text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-green-400">
                ${data.summary.total_revenue?.toLocaleString() || 0}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
              <p className="text-sm text-gray-400">Total Expenses</p>
              <p className="text-2xl font-bold text-red-400">
                ${data.summary.total_expenses?.toLocaleString() || 0}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
              <p className="text-sm text-gray-400">Profit Margin</p>
              <p className="text-2xl font-bold text-blue-400">
                {data.summary.profit_margin || 0}%
              </p>
            </div>
          </div>
        )}

        {/* Invoices */}
        {data.invoices && data.invoices.length > 0 && (
          <div>
            <h3 className="font-bold text-white mb-3">Recent Invoices</h3>
            <div className="space-y-2">
              {data.invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="bg-white/10 backdrop-blur-sm border border-white/20 rounded p-3 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium text-white">{invoice.customer}</p>
                    <p className="text-sm text-gray-400">
                      {invoice.id} • {invoice.date}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">
                      ${invoice.amount.toLocaleString()}
                    </p>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        invoice.status === 'paid'
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-yellow-500/20 text-yellow-300'
                      }`}
                    >
                      {invoice.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expenses */}
        {data.expenses && data.expenses.length > 0 && (
          <div>
            <h3 className="font-bold text-white mb-3">Recent Expenses</h3>
            <div className="space-y-2">
              {data.expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="bg-white/10 backdrop-blur-sm border border-white/20 rounded p-3 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium text-white">{expense.vendor}</p>
                    <p className="text-sm text-gray-400">
                      {expense.category} • {expense.date}
                    </p>
                  </div>
                  <p className="font-bold text-red-400">
                    -${expense.amount.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Salesforce specific display
  if (integration.toLowerCase() === 'salesforce') {
    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        {data.summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
              <p className="text-sm text-gray-400">Total Customers</p>
              <p className="text-2xl font-bold text-blue-400">
                {data.summary.customer_count || 0}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
              <p className="text-sm text-gray-400">Customer Revenue</p>
              <p className="text-2xl font-bold text-green-400">
                ${data.summary.total_revenue?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        )}

        {/* Customers */}
        {data.customers && data.customers.length > 0 && (
          <div>
            <h3 className="font-bold text-white mb-3">Top Customers</h3>
            <div className="space-y-2">
              {data.customers.map((customer) => (
                <div
                  key={customer.id}
                  className="bg-white/10 backdrop-blur-sm border border-white/20 rounded p-3 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium text-white">{customer.name}</p>
                    <p className="text-sm text-gray-400">
                      Last contact: {customer.last_interaction}
                    </p>
                  </div>
                  <p className="font-bold text-green-400">
                    ${customer.revenue.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Generic display for other integrations
  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
      <h3 className="font-bold text-white mb-3">{integration} Data</h3>
      <pre className="text-sm bg-gray-900/50 p-4 rounded overflow-auto text-gray-300">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

// Mock data generator for demonstration
function getMockIntegrationData(integration: string): IntegrationData {
  if (integration.toLowerCase() === 'quickbooks') {
    return {
      summary: {
        total_revenue: 47320,
        total_expenses: 28450,
        customer_count: 47,
        profit_margin: 40,
      },
      invoices: [
        {
          id: 'INV-1034',
          customer: 'Acme Corp',
          amount: 8500,
          status: 'paid',
          date: '2025-11-10',
        },
        {
          id: 'INV-1035',
          customer: 'TechStart Inc',
          amount: 6200,
          status: 'pending',
          date: '2025-11-12',
        },
        {
          id: 'INV-1036',
          customer: 'Global Solutions',
          amount: 4800,
          status: 'paid',
          date: '2025-11-13',
        },
      ],
      expenses: [
        {
          id: 'EXP-523',
          vendor: 'Office Supplies Co',
          amount: 450,
          category: 'Office Supplies',
          date: '2025-11-08',
        },
        {
          id: 'EXP-524',
          vendor: 'Cloud Services Inc',
          amount: 3200,
          category: 'Software',
          date: '2025-11-10',
        },
        {
          id: 'EXP-525',
          vendor: 'Marketing Agency',
          amount: 2800,
          category: 'Marketing',
          date: '2025-11-11',
        },
      ],
    };
  }

  if (integration.toLowerCase() === 'salesforce') {
    return {
      summary: {
        customer_count: 47,
        total_revenue: 47320,
      },
      customers: [
        {
          id: 'CUST-001',
          name: 'Acme Corp',
          revenue: 8500,
          last_interaction: '2025-11-10',
        },
        {
          id: 'CUST-002',
          name: 'TechStart Inc',
          revenue: 6200,
          last_interaction: '2025-11-12',
        },
        {
          id: 'CUST-003',
          name: 'Global Solutions',
          revenue: 4800,
          last_interaction: '2025-11-13',
        },
        {
          id: 'CUST-004',
          name: 'Innovate LLC',
          revenue: 3900,
          last_interaction: '2025-11-11',
        },
        {
          id: 'CUST-005',
          name: 'Digital Dynamics',
          revenue: 3200,
          last_interaction: '2025-11-09',
        },
      ],
    };
  }

  // Default mock data
  return {
    summary: {
      total_revenue: 0,
      total_expenses: 0,
      customer_count: 0,
    },
  };
}
