'use client';

import { useState } from 'react';
import { IntegrationLogo } from './IntegrationLogo';

interface Integration {
  id: number;
  name: string;
  category: string;
  description: string;
  monthlyPrice: number;
  logo: string;
  developer: string;
  hasAdapter?: boolean;
  features: string[];
  dataSync?: string[];
  storageInfo?: string;
}

interface IntegrationCardProps {
  integration: Integration;
  onInstall: () => void;
  canInstall: boolean;
  isInstalled?: boolean;
  isPurchasing?: boolean;
}

export function IntegrationCard({
  integration,
  onInstall,
  canInstall,
  isInstalled = false,
  isPurchasing = false,
}: IntegrationCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <>
      {/* Card */}
      <div
        className="bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden group"
        onClick={() => setShowDetails(true)}
      >
        {/* Card Header */}
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="group-hover:scale-110 transition-transform">
              <IntegrationLogo integration={integration.logo} size="lg" />
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
              {integration.category}
            </span>
          </div>

          <h3 className="text-lg font-bold text-gray-900 mb-1">{integration.name}</h3>
          <p className="text-xs text-gray-500 mb-3">by {integration.developer}</p>
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{integration.description}</p>

          {/* Price */}
          <div className="mb-4">
            <p className="text-2xl font-bold text-gray-900">
              {integration.monthlyPrice === 0 ? (
                <span className="text-green-600">Free</span>
              ) : (
                <>
                  ${integration.monthlyPrice}
                  <span className="text-sm text-gray-500 font-normal">/mo</span>
                </>
              )}
            </p>
          </div>

          {/* Features Preview */}
          <ul className="space-y-1.5 mb-4">
            {integration.features.slice(0, 3).map((feature, i) => (
              <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>{feature}</span>
              </li>
            ))}
            {integration.features.length > 3 && (
              <li className="text-xs text-blue-600 font-medium">
                +{integration.features.length - 3} more features
              </li>
            )}
          </ul>
        </div>

        {/* Card Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onInstall();
            }}
            disabled={!canInstall || isInstalled || isPurchasing}
            className={`w-full py-3 rounded-lg font-semibold transition-all text-sm ${
              isInstalled
                ? 'bg-green-50 text-green-700 border-2 border-green-200 cursor-default'
                : isPurchasing
                ? 'bg-yellow-50 text-yellow-700 border-2 border-yellow-200 cursor-wait'
                : canInstall
                ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200'
            }`}
          >
            {isInstalled ? (
              <span className="flex items-center justify-center gap-2">
                <span>✓</span> Installed
              </span>
            ) : isPurchasing ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-yellow-700 border-t-transparent rounded-full animate-spin"></div>
                Installing...
              </span>
            ) : (
              'Install Now'
            )}
          </button>
        </div>
      </div>

      {/* Details Modal */}
      {showDetails && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowDetails(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-start justify-between">
              <div className="flex items-start gap-4">
                <IntegrationLogo integration={integration.logo} size="lg" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-gray-900">{integration.name}</h2>
                    {integration.hasAdapter && (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                        ✓ Ready
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">by {integration.developer}</p>
                  <span className="inline-block mt-2 text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                    {integration.category}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Description */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">About</h3>
                <p className="text-gray-600">{integration.description}</p>
              </div>

              {/* Pricing */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Pricing</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-3xl font-bold text-gray-900">
                    {integration.monthlyPrice === 0 ? (
                      <span className="text-green-600">Free</span>
                    ) : (
                      <>
                        ${integration.monthlyPrice}
                        <span className="text-base text-gray-500 font-normal">/month</span>
                      </>
                    )}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Billed monthly via USDC on Varity L3</p>
                </div>
              </div>

              {/* Features */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Features</h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {integration.features.map((feature, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Data Synced */}
              {integration.dataSync && integration.dataSync.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Data Synced</h3>
                  <div className="flex flex-wrap gap-2">
                    {integration.dataSync.map((data, i) => (
                      <span
                        key={i}
                        className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full font-medium"
                      >
                        {data}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Storage Info */}
              {integration.storageInfo && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                    <span>🔒</span> Encrypted Storage
                  </h3>
                  <p className="text-sm text-purple-800">{integration.storageInfo}</p>
                </div>
              )}

              {/* Install Button */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onInstall();
                    setShowDetails(false);
                  }}
                  disabled={!canInstall || isInstalled || isPurchasing}
                  className={`w-full py-4 rounded-lg font-semibold transition-all ${
                    isInstalled
                      ? 'bg-green-50 text-green-700 border-2 border-green-200 cursor-default'
                      : isPurchasing
                      ? 'bg-yellow-50 text-yellow-700 border-2 border-yellow-200 cursor-wait'
                      : canInstall
                      ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200'
                  }`}
                >
                  {isInstalled ? (
                    <span className="flex items-center justify-center gap-2">
                      <span>✓</span> Already Installed
                    </span>
                  ) : isPurchasing ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-yellow-700 border-t-transparent rounded-full animate-spin"></div>
                      Installing...
                    </span>
                  ) : (
                    `Install ${integration.name}`
                  )}
                </button>
                {!canInstall && !isInstalled && (
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Please sign in to install integrations
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
