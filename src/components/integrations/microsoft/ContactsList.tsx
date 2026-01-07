'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  MapPin,
  Building,
  Edit3,
  Trash2,
  X,
  Save,
  Star,
  MoreVertical,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  emails: string[];
  phones: string[];
  company?: string;
  jobTitle?: string;
}

interface ContactsListProps {
  walletAddress: string;
  contacts: Contact[];
  onDataChange?: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://generic-template-dashboard-production.up.railway.app';

export default function ContactsList({ walletAddress, contacts, onDataChange }: ContactsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    jobTitle: ''
  });

  // State for live API data
  const [liveContacts, setLiveContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  // Fetch contacts from live Microsoft Graph API
  const fetchContactsFromAPI = useCallback(async () => {
    if (!walletAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/v1/integrations/microsoft/contacts?wallet_address=${walletAddress}&top=100`
      );

      if (!response.ok) {
        if (response.status === 401) {
          setError('Microsoft 365 connection expired. Please reconnect.');
          return;
        }
        throw new Error(`Failed to fetch contacts: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.contacts) {
        // Transform Microsoft Graph contacts to our format
        const transformedContacts: Contact[] = data.contacts.map((c: {
          id: string;
          displayName: string;
          emailAddresses?: Array<{ address: string }>;
          businessPhones?: string[];
          mobilePhone?: string;
          companyName?: string;
          jobTitle?: string;
        }) => ({
          id: c.id,
          name: c.displayName || 'Unknown',
          emails: c.emailAddresses?.map((e: { address: string }) => e.address) || [],
          phones: [...(c.businessPhones || []), c.mobilePhone].filter(Boolean) as string[],
          company: c.companyName,
          jobTitle: c.jobTitle
        }));

        setLiveContacts(transformedContacts);
        setLastFetched(new Date());
      }
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  // Fetch contacts on mount
  useEffect(() => {
    fetchContactsFromAPI();
  }, [fetchContactsFromAPI]);

  // Use live data if available, otherwise fall back to props
  const effectiveContacts = liveContacts.length > 0 ? liveContacts : contacts;

  const filteredContacts = effectiveContacts.filter((contact) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      contact.name.toLowerCase().includes(query) ||
      contact.emails.some((e) => e.toLowerCase().includes(query)) ||
      contact.company?.toLowerCase().includes(query)
    );
  });

  const handleCreateContact = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/microsoft/contacts`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet_address: walletAddress,
            name: formData.name,
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            company: formData.company || undefined,
            job_title: formData.jobTitle || undefined
          })
        }
      );

      if (response.ok) {
        alert('Contact created successfully!');
        setShowContactForm(false);
        setFormData({ name: '', email: '', phone: '', company: '', jobTitle: '' });
        // Refresh contacts list from live API
        fetchContactsFromAPI();
        onDataChange?.();
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail || 'Failed to create contact'}`);
      }
    } catch (error) {
      console.error('Error creating contact:', error);
      alert('Network error. Please try again.');
    }
  };

  return (
    <div className="flex h-full gap-4">
      {/* Contacts List */}
      <div className="w-96 flex flex-col rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-gray-900">Contacts</h2>
              {isLoading && (
                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
              )}
              {lastFetched && !isLoading && (
                <span className="text-xs text-gray-400">
                  Live
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchContactsFromAPI}
                disabled={isLoading}
                className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                title="Refresh contacts"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowContactForm(true)}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                New
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-gray-500">No contacts found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`cursor-pointer p-4 transition-colors hover:bg-gray-50 ${
                    selectedContact?.id === contact.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{contact.name}</p>
                      {contact.jobTitle && (
                        <p className="text-sm text-gray-600 truncate">{contact.jobTitle}</p>
                      )}
                      {contact.emails[0] && (
                        <p className="text-sm text-gray-500 truncate">{contact.emails[0]}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contact Details */}
      <div className="flex-1 rounded-lg border border-gray-200 bg-white shadow-sm">
        {selectedContact ? (
          <div className="p-6">
            <div className="mb-6 flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-2xl text-white font-semibold">
                  {selectedContact.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedContact.name}</h2>
                  {selectedContact.jobTitle && (
                    <p className="text-gray-600">{selectedContact.jobTitle}</p>
                  )}
                  {selectedContact.company && (
                    <p className="text-sm text-gray-500">{selectedContact.company}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    alert('Edit functionality coming soon. You can edit contacts directly in Outlook for now.');
                  }}
                  className="rounded-lg p-2 hover:bg-gray-100"
                  title="Edit contact"
                >
                  <Edit3 className="h-5 w-5 text-gray-600" />
                </button>
                <button
                  onClick={async () => {
                    if (!confirm(`Are you sure you want to delete ${selectedContact.name}?`)) return;
                    try {
                      const response = await fetch(
                        `${API_URL}/api/v1/integrations/microsoft/contacts/${selectedContact.id}?wallet_address=${walletAddress}`,
                        { method: 'DELETE' }
                      );
                      if (response.ok) {
                        alert('Contact deleted successfully!');
                        setSelectedContact(null);
                        // Refresh contacts list from live API
                        fetchContactsFromAPI();
                        onDataChange?.();
                      } else {
                        const error = await response.json();
                        alert(`Error: ${error.detail || 'Failed to delete contact'}`);
                      }
                    } catch (error) {
                      console.error('Error deleting contact:', error);
                      alert('Network error. Please try again.');
                    }
                  }}
                  className="rounded-lg p-2 hover:bg-gray-100 hover:bg-red-50"
                  title="Delete contact"
                >
                  <Trash2 className="h-5 w-5 text-gray-600 hover:text-red-600" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {selectedContact.emails.length > 0 && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Mail className="h-4 w-4" />
                    Email
                  </div>
                  {selectedContact.emails.map((email, index) => (
                    <a
                      key={index}
                      href={`mailto:${email}`}
                      className="block text-blue-600 hover:underline"
                    >
                      {email}
                    </a>
                  ))}
                </div>
              )}

              {selectedContact.phones.length > 0 && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Phone className="h-4 w-4" />
                    Phone
                  </div>
                  {selectedContact.phones.map((phone, index) => (
                    <a
                      key={index}
                      href={`tel:${phone}`}
                      className="block text-blue-600 hover:underline"
                    >
                      {phone}
                    </a>
                  ))}
                </div>
              )}

              {selectedContact.company && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Building className="h-4 w-4" />
                    Company
                  </div>
                  <p className="text-gray-900">{selectedContact.company}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Users className="mx-auto h-16 w-16 text-gray-300" />
              <p className="mt-4 text-gray-500">Select a contact to view details</p>
            </div>
          </div>
        )}
      </div>

      {/* New Contact Form Modal */}
      {showContactForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">New Contact</h3>
              <button
                onClick={() => setShowContactForm(false)}
                className="rounded-lg p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="Full name"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Company
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="Company name"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Job Title
                </label>
                <input
                  type="text"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="Job title"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={handleCreateContact}
                className="flex-1 rounded-lg bg-blue-600 py-2 font-medium text-white hover:bg-blue-700"
              >
                Create Contact
              </button>
              <button
                onClick={() => setShowContactForm(false)}
                className="flex-1 rounded-lg border border-gray-300 py-2 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
