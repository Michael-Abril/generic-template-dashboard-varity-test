'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  Building,
  Star,
  Edit3,
  Trash2,
  X,
  UserPlus,
  MoreVertical
} from 'lucide-react';

interface ContactsListProps {
  walletAddress: string;
  data: any;
}

interface Contact {
  resourceName: string;
  name: string;
  emails: string[];
  phones: string[];
  company: string;
}

export function ContactsList({ walletAddress, data }: ContactsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadContacts();
  }, [walletAddress]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/google/contacts?wallet_address=${walletAddress}`
      );
      const result = await response.json();
      if (result.success && result.contacts) {
        const parsedContacts = result.contacts.map((contact: any) => ({
          resourceName: contact.resourceName,
          name: contact.names?.[0]?.displayName || 'Unknown',
          emails: contact.emailAddresses?.map((e: any) => e.value) || [],
          phones: contact.phoneNumbers?.map((p: any) => p.value) || [],
          company: contact.organizations?.[0]?.name || ''
        }));
        setContacts(parsedContacts);
      }
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.emails.some(email => email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    contact.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteContact = async (contact: Contact) => {
    if (!confirm(`Are you sure you want to delete ${contact.name}?`)) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/google/contacts/${encodeURIComponent(contact.resourceName)}?wallet_address=${walletAddress}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setContacts(contacts.filter(c => c.resourceName !== contact.resourceName));
        setSelectedContact(null);
      }
    } catch (error) {
      console.error('Failed to delete contact:', error);
      alert('Failed to delete contact');
    }
  };

  return (
    <div className="bg-white rounded-lg border flex h-[calc(100vh-200px)]">
      {/* Sidebar */}
      <div className="w-64 border-r p-4 flex flex-col">
        <button
          onClick={() => setShowContactForm(true)}
          className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mb-4"
        >
          <UserPlus className="h-4 w-4" />
          Create Contact
        </button>

        <div className="space-y-1">
          <button className="w-full flex items-center gap-3 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg">
            <Users className="h-4 w-4" />
            <span className="font-medium">All Contacts</span>
            <span className="ml-auto text-sm">{contacts.length}</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 rounded-lg">
            <Star className="h-4 w-4" />
            <span className="font-medium">Starred</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full"
            />
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {filteredContacts.map((contact) => (
              <div
                key={contact.resourceName}
                className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedContact(contact)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-lg font-bold text-blue-600">
                        {contact.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{contact.name}</h3>
                      {contact.company && (
                        <p className="text-sm text-gray-500">{contact.company}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedContact(contact);
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  {contact.emails[0] && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{contact.emails[0]}</span>
                    </div>
                  )}
                  {contact.phones[0] && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-3 w-3" />
                      <span>{contact.phones[0]}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact Detail Modal */}
      {selectedContact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-blue-600">
                      {selectedContact.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedContact.name}</h2>
                    {selectedContact.company && (
                      <p className="text-gray-600">{selectedContact.company}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedContact(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                {selectedContact.emails.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Email</p>
                    <div className="space-y-1">
                      {selectedContact.emails.map((email, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <a
                            href={`mailto:${email}`}
                            className="text-blue-600 hover:underline"
                          >
                            {email}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedContact.phones.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Phone</p>
                    <div className="space-y-1">
                      {selectedContact.phones.map((phone, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <a
                            href={`tel:${phone}`}
                            className="text-blue-600 hover:underline"
                          >
                            {phone}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedContact.company && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Company</p>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-gray-400" />
                      <span>{selectedContact.company}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-6 border-t">
                <button
                  onClick={() => {
                    setSelectedContact(null);
                    setShowContactForm(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteContact(selectedContact)}
                  className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 ml-auto"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Create Contact</h2>
              <button onClick={() => setShowContactForm(false)}>
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="border-t px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowContactForm(false)}
                className="px-6 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
