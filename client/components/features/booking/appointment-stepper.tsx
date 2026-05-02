"use client";

import { useState } from "react";
import { StepperHeader } from "./stepper-header";
import { StepReview } from "./steps/step-review";
import { StepDate } from "./steps/step-date";
import { StepTime } from "./steps/step-time";
import { StepInfo } from "./steps/step-info";
import { StepConfirmation } from "./steps/step-confirmation";
import type { OrgDetail, BookingData } from "@/types";

interface AppointmentStepperProps {
  org: OrgDetail;
  onClose: () => void;
}

export function AppointmentStepper({ org, onClose }: AppointmentStepperProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<BookingData>({
    date: null,
    timeSlot: null,
    concern: "",
    notes: "",
  });

  const updateFormData = (data: Partial<BookingData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const nextStep = () => setCurrentStep((p) => Math.min(p + 1, 5));
  const prevStep = () => setCurrentStep((p) => Math.max(p - 1, 1));

  return (
    <div className="flex h-[600px] flex-col">
      <StepperHeader currentStep={currentStep} totalSteps={5} />

      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="h-full">
          {currentStep === 1 && <StepReview org={org} onNext={nextStep} />}
          {currentStep === 2 && (
            <StepDate
              formData={formData}
              updateFormData={updateFormData}
              onNext={nextStep}
              onPrev={prevStep}
            />
          )}
          {currentStep === 3 && (
            <StepTime
              formData={formData}
              updateFormData={updateFormData}
              onNext={nextStep}
              onPrev={prevStep}
            />
          )}
          {currentStep === 4 && (
            <StepInfo
              formData={formData}
              updateFormData={updateFormData}
              onNext={nextStep}
              onPrev={prevStep}
            />
          )}
          {currentStep === 5 && (
            <StepConfirmation org={org} formData={formData} onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}
