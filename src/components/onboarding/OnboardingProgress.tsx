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
      {/* Mobile: Simple progress bar */}
      <div className="md:hidden">
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">Step {currentStep + 1} of {totalSteps}</span>
            <span className="text-gray-900 font-medium">{steps[currentStep]}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Desktop: Step indicator */}
      <div className="hidden md:block">
        <div className="bg-white rounded-lg px-5 py-3 border border-gray-200">
          <div className="flex items-center justify-center gap-1">
            {steps.map((label, index) => {
              const isComplete = index < currentStep;
              const isCurrent = index === currentStep;

              return (
                <div key={index} className="flex items-center">
                  {/* Step circle */}
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                      isComplete
                        ? 'bg-green-600 text-white'
                        : isCurrent
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isComplete ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>

                  {/* Step label */}
                  <span
                    className={`ml-2 text-sm font-medium whitespace-nowrap ${
                      isComplete
                        ? 'text-green-600'
                        : isCurrent
                        ? 'text-gray-900'
                        : 'text-gray-400'
                    }`}
                  >
                    {label}
                  </span>

                  {/* Connector line */}
                  {index < steps.length - 1 && (
                    <div className="relative w-6 lg:w-8 h-0.5 mx-2">
                      <div className="absolute inset-0 bg-gray-200 rounded-full"></div>
                      <div
                        className={`absolute inset-y-0 left-0 bg-green-600 rounded-full transition-all duration-300 ${
                          isComplete ? 'w-full' : 'w-0'
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
