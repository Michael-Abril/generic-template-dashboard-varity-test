"use client";

import React, { useState } from 'react';
import { X, Save, DollarSign, Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ExpenseFormData {
  vendor?: string;
  category: string;
  date: string;
  amount: number;
  paymentMethod: string;
  paymentAccount?: string;
  referenceNumber?: string;
  memo?: string;
  billable?: boolean;
  customer?: string;
  receipt?: File | null;
}

interface ExpenseFormProps {
  expense?: ExpenseFormData;
  onClose: () => void;
  onSave: (expenseData: ExpenseFormData) => void;
  loading?: boolean;
}

const EXPENSE_CATEGORIES = [
  'Advertising & Marketing',
  'Auto & Vehicle',
  'Bank Charges & Fees',
  'Contract Labor',
  'Equipment Rental',
  'Insurance',
  'Interest Paid',
  'Legal & Professional Services',
  'Meals & Entertainment',
  'Office Supplies',
  'Rent or Lease',
  'Repairs & Maintenance',
  'Software & Subscriptions',
  'Taxes & Licenses',
  'Travel',
  'Utilities',
  'Other',
];

const PAYMENT_METHODS = [
  'Cash',
  'Check',
  'Credit Card',
  'Debit Card',
  'ACH/Bank Transfer',
  'Other',
];

export default function ExpenseForm({ expense, onClose, onSave, loading = false }: ExpenseFormProps) {
  const [formData, setFormData] = useState<ExpenseFormData>(expense || {
    vendor: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    paymentMethod: 'Credit Card',
    paymentAccount: '',
    referenceNumber: '',
    memo: '',
    billable: false,
    customer: '',
    receipt: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  const handleChange = (field: keyof ExpenseFormData, value: string | number | boolean | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleChange('receipt', file);

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview(null);
    }
  };

  const removeReceipt = () => {
    handleChange('receipt', null);
    setReceiptPreview(null);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validate()) {
      onSave(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {expense ? 'Edit Expense' : 'New Expense'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Expense Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vendor/Payee
                </label>
                <Input
                  type="text"
                  value={formData.vendor || ''}
                  onChange={(e) => handleChange('vendor', e.target.value)}
                  placeholder="Who did you pay?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 ${
                    errors.category ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">Select category...</option>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600">{errors.category}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  className={errors.date ? 'border-red-500' : ''}
                />
                {errors.date && (
                  <p className="mt-1 text-sm text-red-600">{errors.date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    type="number"
                    value={formData.amount || ''}
                    onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
                    className={`pl-7 ${errors.amount ? 'border-red-500' : ''}`}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => handleChange('paymentMethod', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 ${
                    errors.paymentMethod ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {PAYMENT_METHODS.map(method => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
                {errors.paymentMethod && (
                  <p className="mt-1 text-sm text-red-600">{errors.paymentMethod}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reference Number
                </label>
                <Input
                  type="text"
                  value={formData.referenceNumber || ''}
                  onChange={(e) => handleChange('referenceNumber', e.target.value)}
                  placeholder="Check # or transaction ID"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Memo/Description
                </label>
                <textarea
                  value={formData.memo || ''}
                  onChange={(e) => handleChange('memo', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                  placeholder="What was this expense for?"
                />
              </div>
            </div>

            {/* Billable Option */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="billable"
                  checked={formData.billable || false}
                  onChange={(e) => handleChange('billable', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="billable" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  This is a billable expense
                </label>
              </div>

              {formData.billable && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Customer to Bill
                  </label>
                  <select
                    value={formData.customer || ''}
                    onChange={(e) => handleChange('customer', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                  >
                    <option value="">Select customer...</option>
                    <option value="Acme Corporation">Acme Corporation</option>
                    <option value="Tech Solutions Inc">Tech Solutions Inc</option>
                    <option value="Global Enterprises">Global Enterprises</option>
                  </select>
                </div>
              )}
            </div>

            {/* Receipt Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Receipt
              </label>

              {receiptPreview ? (
                <div className="relative inline-block">
                  <img
                    src={receiptPreview}
                    alt="Receipt preview"
                    className="max-w-xs max-h-48 rounded-lg border border-gray-200 dark:border-gray-700"
                  />
                  <button
                    type="button"
                    onClick={removeReceipt}
                    className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Click to upload receipt
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    PNG, JPG, PDF up to 10MB
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Expense'}
          </Button>
        </div>
      </div>
    </div>
  );
}
