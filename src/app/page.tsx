'use client';

import { AppHeader } from '@/components/layout/AppHeader';
import { StepSidebar } from '@/components/layout/StepSidebar';
import { Step1Input } from '@/components/steps/Step1Input';
import { Step2Scrape } from '@/components/steps/Step2Scrape';
import { Step3Extract } from '@/components/steps/Step3Extract';
import { Step4Personas } from '@/components/steps/Step4Personas';
import { Step5Verdicts } from '@/components/steps/Step5Verdicts';
import { Step6Article } from '@/components/steps/Step6Article';
import { Step7Polish } from '@/components/steps/Step7Polish';
import { Step8Review } from '@/components/steps/Step8Review';
import { useAppStore } from '@/lib/store';

const stepComponents = {
  1: Step1Input,
  2: Step2Scrape,
  3: Step3Extract,
  4: Step4Personas,
  5: Step5Verdicts,
  6: Step6Article,
  7: Step7Polish,
  8: Step8Review,
};

export default function Home() {
  const currentStep = useAppStore((state) => state.currentStep);
  const StepComponent = stepComponents[currentStep as keyof typeof stepComponents];
  
  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      
      <div className="flex">
        <StepSidebar />
        
        <main className="flex-1 p-8">
          <StepComponent />
        </main>
      </div>
    </div>
  );
}

