import React from 'react';
import { Check } from 'lucide-react';

interface Step {
  id: number;
  label: string;
  description: string;
}

interface WizardStepperProps {
  steps: Step[];
  currentStep: number;
  onStepChange: (step: number) => void;
}

const WizardStepper: React.FC<WizardStepperProps> = ({ steps, currentStep, onStepChange }) => {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
        Wizard Steps
      </h3>
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = step.id < currentStep;
        
        return (
          <button
            key={step.id}
            onClick={() => onStepChange(step.id)}
            className={cn(
              "stepper-step w-full text-left",
              isActive && "stepper-step-active",
              isCompleted && "stepper-step-completed",
              !isActive && !isCompleted && "stepper-step-pending"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium",
              isActive && "bg-primary-foreground/20 text-primary-foreground",
              isCompleted && "bg-green-600 text-white",
              !isActive && !isCompleted && "bg-muted-foreground/20"
            )}>
              {isCompleted ? <Check className="w-4 h-4" /> : step.id}
            </div>
            <div className="min-w-0">
              <div className="font-medium text-sm truncate">{step.label}</div>
              <div className={cn(
                "text-xs truncate",
                isActive ? "text-primary-foreground/70" : "text-muted-foreground"
              )}>
                {step.description}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default WizardStepper;
