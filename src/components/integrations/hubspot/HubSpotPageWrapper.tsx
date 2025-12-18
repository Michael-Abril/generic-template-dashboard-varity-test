'use client';

import { useState } from 'react';
import { HubSpotPage } from './HubSpotPage';
import { ContactForm } from './ContactForm';
import { CompanyForm } from './CompanyForm';
import { DealForm } from './DealForm';
import { TicketForm } from './TicketForm';
import { PipelineBoard } from './PipelineBoard';

interface HubSpotPageWrapperProps {
  walletAddress: string;
  data: any[];
  loading: boolean;
  syncing: boolean;
  error: string | null;
  lastSync: string | null;
  onSync: () => void;
  onRefresh: () => void;
}

export function HubSpotPageWrapper(props: HubSpotPageWrapperProps) {
  const [showContactForm, setShowContactForm] = useState(false);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showDealForm, setShowDealForm] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [showPipelineBoard, setShowPipelineBoard] = useState(false);

  const [editingContact, setEditingContact] = useState<any>(null);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [editingDeal, setEditingDeal] = useState<any>(null);
  const [editingTicket, setEditingTicket] = useState<any>(null);

  const [formLoading, setFormLoading] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

  // Contact CRUD
  const handleSaveContact = async (contactData: any) => {
    setFormLoading(true);
    try {
      const endpoint = editingContact
        ? `${apiUrl}/api/v1/hubspot/contacts/${editingContact.id}`
        : `${apiUrl}/api/v1/hubspot/contacts`;

      const method = editingContact ? 'PATCH' : 'POST';

      const response = await fetch(`${endpoint}?wallet_address=${props.walletAddress}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData),
      });

      const result = await response.json();

      if (result.success) {
        setShowContactForm(false);
        setEditingContact(null);
        props.onRefresh(); // Refresh data after successful save
      } else {
        alert(`Error: ${result.detail || 'Failed to save contact'}`);
      }
    } catch (error) {
      console.error('Error saving contact:', error);
      alert('Failed to save contact');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      const response = await fetch(
        `${apiUrl}/api/v1/hubspot/contacts/${contactId}?wallet_address=${props.walletAddress}`,
        { method: 'DELETE' }
      );

      const result = await response.json();

      if (result.success) {
        props.onRefresh();
      } else {
        alert(`Error: ${result.detail || 'Failed to delete contact'}`);
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert('Failed to delete contact');
    }
  };

  // Company CRUD
  const handleSaveCompany = async (companyData: any) => {
    setFormLoading(true);
    try {
      const endpoint = editingCompany
        ? `${apiUrl}/api/v1/hubspot/companies/${editingCompany.id}`
        : `${apiUrl}/api/v1/hubspot/companies`;

      const method = editingCompany ? 'PATCH' : 'POST';

      const response = await fetch(`${endpoint}?wallet_address=${props.walletAddress}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyData),
      });

      const result = await response.json();

      if (result.success) {
        setShowCompanyForm(false);
        setEditingCompany(null);
        props.onRefresh();
      } else {
        alert(`Error: ${result.detail || 'Failed to save company'}`);
      }
    } catch (error) {
      console.error('Error saving company:', error);
      alert('Failed to save company');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!confirm('Are you sure you want to delete this company?')) return;

    try {
      const response = await fetch(
        `${apiUrl}/api/v1/hubspot/companies/${companyId}?wallet_address=${props.walletAddress}`,
        { method: 'DELETE' }
      );

      const result = await response.json();

      if (result.success) {
        props.onRefresh();
      } else {
        alert(`Error: ${result.detail || 'Failed to delete company'}`);
      }
    } catch (error) {
      console.error('Error deleting company:', error);
      alert('Failed to delete company');
    }
  };

  // Deal CRUD
  const handleSaveDeal = async (dealData: any) => {
    setFormLoading(true);
    try {
      const endpoint = editingDeal
        ? `${apiUrl}/api/v1/hubspot/deals/${editingDeal.id}`
        : `${apiUrl}/api/v1/hubspot/deals`;

      const method = editingDeal ? 'PATCH' : 'POST';

      const response = await fetch(`${endpoint}?wallet_address=${props.walletAddress}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dealData),
      });

      const result = await response.json();

      if (result.success) {
        setShowDealForm(false);
        setEditingDeal(null);
        props.onRefresh();
      } else {
        alert(`Error: ${result.detail || 'Failed to save deal'}`);
      }
    } catch (error) {
      console.error('Error saving deal:', error);
      alert('Failed to save deal');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateDealStage = async (dealId: string, newStage: string) => {
    try {
      const response = await fetch(
        `${apiUrl}/api/v1/hubspot/deals/${dealId}?wallet_address=${props.walletAddress}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dealstage: newStage }),
        }
      );

      const result = await response.json();

      if (result.success) {
        props.onRefresh();
      } else {
        alert(`Error: ${result.detail || 'Failed to update deal'}`);
      }
    } catch (error) {
      console.error('Error updating deal:', error);
      alert('Failed to update deal');
    }
  };

  const handleDeleteDeal = async (dealId: string) => {
    if (!confirm('Are you sure you want to delete this deal?')) return;

    try {
      const response = await fetch(
        `${apiUrl}/api/v1/hubspot/deals/${dealId}?wallet_address=${props.walletAddress}`,
        { method: 'DELETE' }
      );

      const result = await response.json();

      if (result.success) {
        props.onRefresh();
      } else {
        alert(`Error: ${result.detail || 'Failed to delete deal'}`);
      }
    } catch (error) {
      console.error('Error deleting deal:', error);
      alert('Failed to delete deal');
    }
  };

  // Ticket CRUD
  const handleSaveTicket = async (ticketData: any) => {
    setFormLoading(true);
    try {
      const endpoint = editingTicket
        ? `${apiUrl}/api/v1/hubspot/tickets/${editingTicket.id}`
        : `${apiUrl}/api/v1/hubspot/tickets`;

      const method = editingTicket ? 'PATCH' : 'POST';

      const response = await fetch(`${endpoint}?wallet_address=${props.walletAddress}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketData),
      });

      const result = await response.json();

      if (result.success) {
        setShowTicketForm(false);
        setEditingTicket(null);
        props.onRefresh();
      } else {
        alert(`Error: ${result.detail || 'Failed to save ticket'}`);
      }
    } catch (error) {
      console.error('Error saving ticket:', error);
      alert('Failed to save ticket');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('Are you sure you want to delete this ticket?')) return;

    try {
      const response = await fetch(
        `${apiUrl}/api/v1/hubspot/tickets/${ticketId}?wallet_address=${props.walletAddress}`,
        { method: 'DELETE' }
      );

      const result = await response.json();

      if (result.success) {
        props.onRefresh();
      } else {
        alert(`Error: ${result.detail || 'Failed to delete ticket'}`);
      }
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert('Failed to delete ticket');
    }
  };

  // Create menu handlers
  const handleCreateClick = (type: string) => {
    switch (type) {
      case 'contact':
        setEditingContact(null);
        setShowContactForm(true);
        break;
      case 'company':
        setEditingCompany(null);
        setShowCompanyForm(true);
        break;
      case 'deal':
        setEditingDeal(null);
        setShowDealForm(true);
        break;
      case 'ticket':
        setEditingTicket(null);
        setShowTicketForm(true);
        break;
    }
  };

  // Pass create handlers and other props to HubSpotPage
  const extendedProps = {
    ...props,
    onCreateContact: () => handleCreateClick('contact'),
    onCreateCompany: () => handleCreateClick('company'),
    onCreateDeal: () => handleCreateClick('deal'),
    onCreateTicket: () => handleCreateClick('ticket'),
    onEditContact: (contact: any) => {
      setEditingContact(contact);
      setShowContactForm(true);
    },
    onDeleteContact: handleDeleteContact,
    onEditCompany: (company: any) => {
      setEditingCompany(company);
      setShowCompanyForm(true);
    },
    onDeleteCompany: handleDeleteCompany,
    onEditDeal: (deal: any) => {
      setEditingDeal(deal);
      setShowDealForm(true);
    },
    onDeleteDeal: handleDeleteDeal,
    onUpdateDealStage: handleUpdateDealStage,
    onEditTicket: (ticket: any) => {
      setEditingTicket(ticket);
      setShowTicketForm(true);
    },
    onDeleteTicket: handleDeleteTicket,
  };

  return (
    <>
      <HubSpotPage {...extendedProps as any} />

      {/* Forms */}
      {showContactForm && (
        <ContactForm
          contact={editingContact}
          onSave={handleSaveContact}
          onCancel={() => {
            setShowContactForm(false);
            setEditingContact(null);
          }}
          loading={formLoading}
        />
      )}

      {showCompanyForm && (
        <CompanyForm
          company={editingCompany}
          onSave={handleSaveCompany}
          onCancel={() => {
            setShowCompanyForm(false);
            setEditingCompany(null);
          }}
          loading={formLoading}
        />
      )}

      {showDealForm && (
        <DealForm
          deal={editingDeal}
          onSave={handleSaveDeal}
          onCancel={() => {
            setShowDealForm(false);
            setEditingDeal(null);
          }}
          loading={formLoading}
        />
      )}

      {showTicketForm && (
        <TicketForm
          ticket={editingTicket}
          onSave={handleSaveTicket}
          onCancel={() => {
            setShowTicketForm(false);
            setEditingTicket(null);
          }}
          loading={formLoading}
        />
      )}
    </>
  );
}
