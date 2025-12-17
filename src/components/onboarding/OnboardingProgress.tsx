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
  return (
    <div className="w-full">
      {/* Mobile: Simple progress bar */}
      <div className="md:hidden mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Step {currentStep + 1} of {totalSteps}</span>
          <span>{steps[currentStep]}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop: Full step indicator */}
      <div className="hidden md:flex items-center justify-center gap-2">
        {steps.map((label, index) => {
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep;
          const isFuture = index > currentStep;

          return (
            <div key={index} className="flex items-center">
              {/* Step circle */}
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm transition-all duration-300 ${
                  isComplete
                    ? 'bg-green-600 text-white'
                    : isCurrent
                    ? 'bg-blue-600 text-white scale-110 shadow-lg ring-4 ring-blue-200'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isComplete ? (
                  <Check className="w-5 h-5" />
                ) : (
                  index + 1
                )}
              </div>

              {/* Step label */}
              <span
                className={`ml-2 text-sm font-medium transition-colors ${
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
                <div
                  className={`w-8 lg:w-12 h-1 mx-2 rounded transition-colors ${
                    isComplete ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
