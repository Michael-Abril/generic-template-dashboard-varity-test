'use client';

import { Users, Clock, Bell, ArrowRight } from 'lucide-react';

interface ContactsListProps {
  walletAddress: string;
  data: any;
}

export function ContactsList({ walletAddress, data }: ContactsListProps) {
  return (
    <div className="bg-white rounded-lg border flex flex-col h-[calc(100vh-200px)]">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          {/* Icon */}
          <div className="relative inline-block mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center">
              <Users className="h-12 w-12 text-blue-500" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center border-4 border-white">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Google Contacts Coming Soon
          </h2>

          {/* Description */}
          <p className="text-gray-600 mb-6 leading-relaxed">
            We&apos;re working on bringing your Google Contacts to Varity.
            Soon you&apos;ll be able to view, search, and manage all your
            contacts in one place.
          </p>

          {/* Features preview */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">What&apos;s coming:</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ArrowRight className="h-4 w-4 text-blue-500" />
                <span>View and search all your contacts</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ArrowRight className="h-4 w-4 text-blue-500" />
                <span>Create and edit contacts</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ArrowRight className="h-4 w-4 text-blue-500" />
                <span>Organize with labels and groups</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ArrowRight className="h-4 w-4 text-blue-500" />
                <span>Quick email and call actions</span>
              </div>
            </div>
          </div>

          {/* Status badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            In Development
          </div>
        </div>
      </div>
    </div>
  );
}
