'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  Building,
  MoreVertical,
  Edit3,
  Trash2,
  X,
  User,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface Contact {
  resourceName: string;
  names?: Array<{ givenName?: string; familyName?: string; displayName?: string }>;
  emailAddresses?: Array<{ value: string; type?: string }>;
  phoneNumbers?: Array<{ value: string; type?: string }>;
  organizations?: Array<{ name?: string; title?: string }>;
}

interface ContactsListProps {
  walletAddress: string;
  data: {
    contacts?: Contact[];
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function ContactsList({ walletAddress, data }: ContactsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>(data?.contacts || []);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const CONTACTS_PER_PAGE = 50;

  // Form state
  const [formData, setFormData] = useState({
    given_name: '',
    family_name: '',
    email: '',
    phone: '',
    company: ''
  });

  // Filter contacts by search query
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const query = searchQuery.toLowerCase();
    return contacts.filter(contact => {
      const name = contact.names?.[0]?.displayName ||
        `${contact.names?.[0]?.givenName || ''} ${contact.names?.[0]?.familyName || ''}`;
      const email = contact.emailAddresses?.[0]?.value || '';
      const company = contact.organizations?.[0]?.name || '';
      return (
        name.toLowerCase().includes(query) ||
        email.toLowerCase().includes(query) ||
        company.toLowerCase().includes(query)
      );
    });
  }, [contacts, searchQuery]);

  // Pagination logic
  const totalPages = Math.ceil(filteredContacts.length / CONTACTS_PER_PAGE);
  const paginatedContacts = useMemo(() => {
    const start = currentPage * CONTACTS_PER_PAGE;
    return filteredContacts.slice(start, start + CONTACTS_PER_PAGE);
  }, [filteredContacts, currentPage]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery]);

  const resetForm = () => {
    setFormData({
      given_name: '',
      family_name: '',
      email: '',
      phone: '',
      company: ''
    });
  };

  const handleCreateContact = async () => {
    if (!formData.given_name && !formData.family_name) {
      setError('Please provide at least a first or last name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/integrations/google/create-contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: walletAddress,
          given_name: formData.given_name,
          family_name: formData.family_name,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          company: formData.company || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create contact');
      }

      const result = await response.json();

      // Add the new contact to the list optimistically
      const newContact: Contact = {
        resourceName: result.resource_name,
        names: [{ givenName: formData.given_name, familyName: formData.family_name }],
        emailAddresses: formData.email ? [{ value: formData.email }] : undefined,
        phoneNumbers: formData.phone ? [{ value: formData.phone }] : undefined,
        organizations: formData.company ? [{ name: formData.company }] : undefined
      };

      setContacts(prev => [newContact, ...prev]);
      setShowCreateModal(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to create contact');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateContact = async () => {
    if (!selectedContact) return;

    setLoading(true);
    setError(null);

    try {
      // Extract the resource name (remove 'people/' prefix if present)
      const resourceName = selectedContact.resourceName.replace('people/', '');

      const response = await fetch(
        `${API_URL}/api/v1/integrations/google/contacts/${resourceName}?wallet_address=${walletAddress}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            given_name: formData.given_name,
            family_name: formData.family_name,
            email: formData.email || undefined,
            phone: formData.phone || undefined
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update contact');
      }

      // Update the contact in the list
      setContacts(prev => prev.map(c => {
        if (c.resourceName === selectedContact.resourceName) {
          return {
            ...c,
            names: [{ givenName: formData.given_name, familyName: formData.family_name }],
            emailAddresses: formData.email ? [{ value: formData.email }] : undefined,
            phoneNumbers: formData.phone ? [{ value: formData.phone }] : undefined
          };
        }
        return c;
      }));

      setShowEditModal(false);
      setSelectedContact(null);
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to update contact');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContact = async (contact: Contact) => {
    if (!confirm(`Delete ${contact.names?.[0]?.displayName || 'this contact'}?`)) return;

    setLoading(true);
    setError(null);

    try {
      // Extract the resource name (remove 'people/' prefix if present)
      const resourceName = contact.resourceName.replace('people/', '');

      const response = await fetch(
        `${API_URL}/api/v1/integrations/google/contacts/${resourceName}?wallet_address=${walletAddress}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete contact');
      }

      // Remove from list
      setContacts(prev => prev.filter(c => c.resourceName !== contact.resourceName));
      setActionMenuOpen(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete contact');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (contact: Contact) => {
    setSelectedContact(contact);
    setFormData({
      given_name: contact.names?.[0]?.givenName || '',
      family_name: contact.names?.[0]?.familyName || '',
      email: contact.emailAddresses?.[0]?.value || '',
      phone: contact.phoneNumbers?.[0]?.value || '',
      company: contact.organizations?.[0]?.name || ''
    });
    setShowEditModal(true);
    setActionMenuOpen(null);
  };

  const getContactInitials = (contact: Contact) => {
    const first = contact.names?.[0]?.givenName?.[0] || '';
    const last = contact.names?.[0]?.familyName?.[0] || '';
    return (first + last).toUpperCase() || '?';
  };

  const getContactName = (contact: Contact) => {
    if (contact.names?.[0]?.displayName) {
      return contact.names[0].displayName;
    }
    const first = contact.names?.[0]?.givenName || '';
    const last = contact.names?.[0]?.familyName || '';
    return `${first} ${last}`.trim() || 'No Name';
  };

  return (
    <div className="bg-white rounded-lg border flex flex-col h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              Contacts ({contacts.length})
            </h2>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Contact
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Pagination Controls */}
        {filteredContacts.length > 0 && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <span className="text-sm text-gray-600">
              {filteredContacts.length === 0
                ? '0 contacts'
                : `${currentPage * CONTACTS_PER_PAGE + 1}-${Math.min((currentPage + 1) * CONTACTS_PER_PAGE, filteredContacts.length)} of ${filteredContacts.length} contacts`}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Previous page"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm text-gray-600 px-2">
                Page {currentPage + 1} of {totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Next page"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="h-4 w-4 text-red-500" />
          </button>
        </div>
      )}

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto">
        {filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Users className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-lg font-medium">No contacts found</p>
            <p className="text-sm">
              {searchQuery ? 'Try a different search term' : 'Click "Add Contact" to create one'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {paginatedContacts.map((contact) => (
              <div
                key={contact.resourceName}
                className="p-4 hover:bg-gray-50 flex items-center gap-4"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-sm font-semibold text-blue-600">
                    {getContactInitials(contact)}
                  </span>
                </div>

                {/* Contact Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {getContactName(contact)}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {contact.emailAddresses?.[0]?.value && (
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3" />
                        {contact.emailAddresses[0].value}
                      </span>
                    )}
                    {contact.phoneNumbers?.[0]?.value && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {contact.phoneNumbers[0].value}
                      </span>
                    )}
                    {contact.organizations?.[0]?.name && (
                      <span className="flex items-center gap-1 truncate">
                        <Building className="h-3 w-3" />
                        {contact.organizations[0].name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="relative">
                  <button
                    onClick={() => setActionMenuOpen(
                      actionMenuOpen === contact.resourceName ? null : contact.resourceName
                    )}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </button>

                  {actionMenuOpen === contact.resourceName && (
                    <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border py-1 z-10">
                      <button
                        onClick={() => openEditModal(contact)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Edit3 className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteContact(contact)}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Contact Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Add Contact</h3>
              <button onClick={() => setShowCreateModal(false)}>
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.given_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, given_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={formData.family_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, family_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Acme Inc."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateContact}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Contact
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Contact Modal */}
      {showEditModal && selectedContact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Edit Contact</h3>
              <button onClick={() => {
                setShowEditModal(false);
                setSelectedContact(null);
              }}>
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={formData.given_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, given_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.family_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, family_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Company cannot be updated via API</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedContact(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateContact}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
