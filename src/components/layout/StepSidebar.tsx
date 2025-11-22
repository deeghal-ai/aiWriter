import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { useAppStore } from '@/lib/store';

const steps = [
  { id: 1, title: 'Input', description: 'Bike comparison details' },
  { id: 2, title: 'Scrape', description: 'Forum threads & comments' },
  { id: 3, title: 'Extract', description: 'Owner insights' },
  { id: 4, title: 'Personas', description: 'Rider archetypes' },
  { id: 5, title: 'Verdicts', description: 'Recommendations' },
  { id: 6, title: 'Article', description: 'Generate content' },
  { id: 7, title: 'Polish', description: 'Quality checks' },
  { id: 8, title: 'Review', description: 'Final edits' }
];

export function StepSidebar() {
  const currentStep = useAppStore((state) => state.currentStep);
  const completedSteps = useAppStore((state) => state.completedSteps);
  const setCurrentStep = useAppStore((state) => state.setCurrentStep);
  
  return (
    <aside className="w-64 border-r bg-slate-50 p-6">
      <div className="space-y-1">
        {steps.map((step) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = currentStep === step.id;
          const isAccessible = isCompleted || isCurrent || step.id === 1;
          
          return (
            <button
              key={step.id}
              onClick={() => isAccessible && setCurrentStep(step.id)}
              disabled={!isAccessible}
              className={cn(
                'w-full text-left p-3 rounded-lg transition-colors',
                'flex items-start gap-3 group',
                isCurrent && 'bg-blue-50 border border-blue-200',
                isCompleted && !isCurrent && 'hover:bg-white cursor-pointer',
                !isAccessible && 'opacity-40 cursor-not-allowed'
              )}
            >
              {/* Step number/status icon */}
              <div
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium',
                  isCompleted && 'bg-green-500 text-white',
                  isCurrent && 'bg-blue-600 text-white',
                  !isCompleted && !isCurrent && 'bg-slate-200 text-slate-600'
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.id
                )}
              </div>
              
              {/* Step details */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-sm font-medium',
                    isCurrent && 'text-blue-900',
                    !isCurrent && 'text-slate-700'
                  )}
                >
                  {step.title}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {step.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Progress indicator */}
      <div className="mt-8 pt-6 border-t">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-slate-600">Progress</span>
          <span className="font-medium text-slate-900">
            {completedSteps.length}/8
          </span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${(completedSteps.length / 8) * 100}%` }}
          />
        </div>
      </div>
    </aside>
  );
}

