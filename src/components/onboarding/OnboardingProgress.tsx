'use client';

import { Check } from 'lucide-react';

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
  steps: string[];
}

export function OnboardingProgress({
  currentStep,
  totalSteps,
  steps
}: OnboardingProgressProps) {
  const progressPercent = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="w-full">
      {/* Mobile: Enhanced progress bar */}
      <div className="md:hidden">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex justify-between text-sm mb-3">
            <span className="text-gray-600 font-medium">Step {currentStep + 1} of {totalSteps}</span>
            <span className="text-blue-600 font-semibold">{steps[currentStep]}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Desktop: Full step indicator */}
      <div className="hidden md:block">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-center gap-1">
            {steps.map((label, index) => {
              const isComplete = index < currentStep;
              const isCurrent = index === currentStep;

              return (
                <div key={index} className="flex items-center">
                  {/* Step circle */}
                  <div className="relative">
                    {isCurrent && (
                      <div className="absolute inset-0 bg-blue-400/30 rounded-full blur-md animate-pulse"></div>
                    )}
                    <div
                      className={`relative flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm transition-all duration-300 ${
                        isComplete
                          ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-md'
                          : isCurrent
                          ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white scale-110 shadow-lg ring-4 ring-blue-200'
                          : 'bg-gray-100 text-gray-400 border border-gray-200'
                      }`}
                    >
                      {isComplete ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        index + 1
                      )}
                    </div>
                  </div>

                  {/* Step label */}
                  <span
                    className={`ml-2 text-sm font-semibold transition-colors whitespace-nowrap ${
                      isComplete
                        ? 'text-green-600'
                        : isCurrent
                        ? 'text-blue-600'
                        : 'text-gray-400'
                    }`}
                  >
                    {label}
                  </span>

                  {/* Connector line */}
                  {index < steps.length - 1 && (
                    <div className="relative w-6 lg:w-10 h-1 mx-2">
                      <div className="absolute inset-0 bg-gray-200 rounded-full"></div>
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                          isComplete ? 'bg-gradient-to-r from-green-500 to-emerald-500 w-full' : 'w-0'
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
