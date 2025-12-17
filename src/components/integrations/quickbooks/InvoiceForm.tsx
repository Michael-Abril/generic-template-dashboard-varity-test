"use client";

import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceFormProps {
  invoice?: {
    id?: string;
    customer?: string;
    number?: string;
    date?: string;
    dueDate?: string;
    terms?: string;
    notes?: string;
    discount?: number;
    tax?: number;
    lineItems?: LineItem[];
  };
  onClose: () => void;
  onSave: (invoiceData: Record<string, unknown>) => void;
}

export default function InvoiceForm({ invoice, onClose, onSave }: InvoiceFormProps) {
  const [formData, setFormData] = useState({
    customer: invoice?.customer || '',
    invoiceNumber: invoice?.number || `INV-${Date.now().toString().slice(-4)}`,
    invoiceDate: invoice?.date || new Date().toISOString().split('T')[0],
    dueDate: invoice?.dueDate || '',
    terms: invoice?.terms || 'Net 30',
    notes: invoice?.notes || '',
    discount: invoice?.discount || 0,
    tax: invoice?.tax || 0,
  });

  const [lineItems, setLineItems] = useState<LineItem[]>(invoice?.lineItems || [
    { id: '1', description: '', quantity: 1, rate: 0, amount: 0 }
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleLineItemChange = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'rate') {
          updated.amount = Number(updated.quantity) * Number(updated.rate);
        }
        return updated;
      }
      return item;
    }));
  };

  const addLineItem = () => {
    setLineItems(prev => [
      ...prev,
      { id: Date.now().toString(), description: '', quantity: 1, rate: 0, amount: 0 }
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discountAmount = (subtotal * formData.discount) / 100;
    const taxAmount = ((subtotal - discountAmount) * formData.tax) / 100;
    return subtotal - discountAmount + taxAmount;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.customer) {
      newErrors.customer = 'Customer is required';
    }
    if (!formData.invoiceDate) {
      newErrors.invoiceDate = 'Invoice date is required';
    }
    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    }
    if (lineItems.every(item => !item.description)) {
      newErrors.lineItems = 'At least one line item is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    const invoiceData = {
      ...formData,
      lineItems,
      subtotal: calculateSubtotal(),
      total: calculateTotal(),
    };

    onSave(invoiceData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {invoice ? 'Edit Invoice' : 'New Invoice'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-6">
          {/* Customer & Invoice Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Customer *
              </label>
              <select
                value={formData.customer}
                onChange={(e) => handleInputChange('customer', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 ${
                  errors.customer ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <option value="">Select customer...</option>
                <option value="Acme Corporation">Acme Corporation</option>
                <option value="Tech Solutions Inc">Tech Solutions Inc</option>
                <option value="Global Enterprises">Global Enterprises</option>
                <option value="Startup Co">Startup Co</option>
              </select>
              {errors.customer && (
                <p className="text-xs text-red-600 mt-1">{errors.customer}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Invoice Number
              </label>
              <Input
                value={formData.invoiceNumber}
                onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
                placeholder="INV-1001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Invoice Date *
              </label>
              <Input
                type="date"
                value={formData.invoiceDate}
                onChange={(e) => handleInputChange('invoiceDate', e.target.value)}
                className={errors.invoiceDate ? 'border-red-500' : ''}
              />
              {errors.invoiceDate && (
                <p className="text-xs text-red-600 mt-1">{errors.invoiceDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Due Date *
              </label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleInputChange('dueDate', e.target.value)}
                className={errors.dueDate ? 'border-red-500' : ''}
              />
              {errors.dueDate && (
                <p className="text-xs text-red-600 mt-1">{errors.dueDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Terms
              </label>
              <select
                value={formData.terms}
                onChange={(e) => handleInputChange('terms', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
              >
                <option value="Due on receipt">Due on receipt</option>
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 60">Net 60</option>
              </select>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Line Items
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLineItem}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Line
              </Button>
            </div>

            {errors.lineItems && (
              <p className="text-xs text-red-600 mb-2">{errors.lineItems}</p>
            )}

            <div className="space-y-2">
              {lineItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-5">
                        <Input
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => handleLineItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="1"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Rate"
                          value={item.rate}
                          onChange={(e) => handleLineItemChange(item.id, 'rate', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={item.amount.toFixed(2)}
                          disabled
                          className="bg-gray-100 dark:bg-gray-900"
                        />
                      </div>
                      <div className="col-span-1 flex items-center justify-center">
                        {lineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLineItem(item.id)}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  ${calculateSubtotal().toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Discount %
                  </label>
                  <Input
                    type="number"
                    value={formData.discount}
                    onChange={(e) => handleInputChange('discount', parseFloat(e.target.value) || 0)}
                    min="0"
                    max="100"
                    step="0.01"
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Tax %
                  </label>
                  <Input
                    type="number"
                    value={formData.tax}
                    onChange={(e) => handleInputChange('tax', parseFloat(e.target.value) || 0)}
                    min="0"
                    max="100"
                    step="0.01"
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between">
                  <span className="font-bold text-gray-900 dark:text-white">Total</span>
                  <span className="font-bold text-xl text-gray-900 dark:text-white">
                    ${calculateTotal().toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
              placeholder="Additional notes or terms..."
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-end space-x-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-green-600 hover:bg-green-700"
          >
            {invoice ? 'Update Invoice' : 'Create Invoice'}
          </Button>
        </div>
      </div>
    </div>
  );
}
