"use client";

import React, { useState } from 'react';
import { X, Save, User, Building, Mail, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CustomerFormData {
  displayName: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  website?: string;
  billingAddress?: {
    line1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  notes?: string;
  taxExempt?: boolean;
}

interface CustomerFormProps {
  customer?: CustomerFormData;
  onClose: () => void;
  onSave: (customerData: CustomerFormData) => void;
  loading?: boolean;
}

export default function CustomerForm({ customer, onClose, onSave, loading = false }: CustomerFormProps) {
  const [formData, setFormData] = useState<CustomerFormData>(customer || {
    displayName: '',
    companyName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    mobile: '',
    website: '',
    billingAddress: {
      line1: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US',
    },
    notes: '',
    taxExempt: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string | boolean) => {
    if (field.startsWith('billingAddress.')) {
      const addressField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        billingAddress: {
          ...prev.billingAddress,
          [addressField]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }

    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.displayName || !formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validate()) {
      // Pass formData to parent - parent handles API transformation
      onSave(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <User className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {customer ? 'Edit Customer' : 'New Customer'}
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
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Display Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => handleChange('displayName', e.target.value)}
                    className={errors.displayName ? 'border-red-500' : ''}
                    placeholder="How you want to refer to this customer"
                  />
                  {errors.displayName && (
                    <p className="mt-1 text-sm text-red-600">{errors.displayName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    First Name
                  </label>
                  <Input
                    type="text"
                    value={formData.firstName || ''}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    placeholder="First name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Name
                  </label>
                  <Input
                    type="text"
                    value={formData.lastName || ''}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    placeholder="Last name"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Building className="w-4 h-4 inline mr-1" />
                    Company Name
                  </label>
                  <Input
                    type="text"
                    value={formData.companyName || ''}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    placeholder="Company name"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                <Mail className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={errors.email ? 'border-red-500' : ''}
                    placeholder="email@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <Input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Mobile
                  </label>
                  <Input
                    type="tel"
                    value={formData.mobile || ''}
                    onChange={(e) => handleChange('mobile', e.target.value)}
                    placeholder="(555) 987-6543"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Website
                  </label>
                  <Input
                    type="url"
                    value={formData.website || ''}
                    onChange={(e) => handleChange('website', e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
              </div>
            </div>

            {/* Billing Address */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
                Billing Address
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Street Address
                  </label>
                  <Input
                    type="text"
                    value={formData.billingAddress?.line1 || ''}
                    onChange={(e) => handleChange('billingAddress.line1', e.target.value)}
                    placeholder="123 Main Street"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    City
                  </label>
                  <Input
                    type="text"
                    value={formData.billingAddress?.city || ''}
                    onChange={(e) => handleChange('billingAddress.city', e.target.value)}
                    placeholder="City"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    State/Province
                  </label>
                  <Input
                    type="text"
                    value={formData.billingAddress?.state || ''}
                    onChange={(e) => handleChange('billingAddress.state', e.target.value)}
                    placeholder="State"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Postal Code
                  </label>
                  <Input
                    type="text"
                    value={formData.billingAddress?.postalCode || ''}
                    onChange={(e) => handleChange('billingAddress.postalCode', e.target.value)}
                    placeholder="12345"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Country
                  </label>
                  <select
                    value={formData.billingAddress?.country || 'US'}
                    onChange={(e) => handleChange('billingAddress.country', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="UK">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Additional Options */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Additional Options
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="taxExempt"
                    checked={formData.taxExempt || false}
                    onChange={(e) => handleChange('taxExempt', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="taxExempt" className="text-sm text-gray-700 dark:text-gray-300">
                    This customer is tax exempt
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                    placeholder="Internal notes about this customer..."
                  />
                </div>
              </div>
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
            {loading ? 'Saving...' : 'Save Customer'}
          </Button>
        </div>
      </div>
    </div>
  );
}
