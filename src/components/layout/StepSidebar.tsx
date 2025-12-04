import { cn } from '@/lib/utils';
import { Check, Sparkles } from 'lucide-react';
import { useAppStore } from '@/lib/store';

const steps = [
  { id: 1, title: 'Input', description: 'Bike details' },
  { id: 2, title: 'Scrape', description: 'Forum data' },
  { id: 3, title: 'Extract', description: 'Owner insights' },
  { id: 4, title: 'Personas', description: 'Rider types' },
  { id: 5, title: 'Verdicts', description: 'Recommendations' },
  { id: 6, title: 'Article', description: 'Generate' },
  { id: 7, title: 'Polish', description: 'Quality check' },
  { id: 8, title: 'Review', description: 'Final edits' }
];

export function StepSidebar() {
  const currentStep = useAppStore((state) => state.currentStep);
  const completedSteps = useAppStore((state) => state.completedSteps);
  const setCurrentStep = useAppStore((state) => state.setCurrentStep);
  
  const progress = (completedSteps.length / 8) * 100;
  
  return (
    <aside className="w-52 border-r border-border/50 bg-white relative flex-shrink-0">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] to-transparent" />
      
      <div className="relative px-3 py-4 h-full flex flex-col">
        {/* Steps list */}
        <div className="space-y-0.5 flex-1">
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
                  'w-full text-left px-2 py-1.5 rounded-lg transition-all duration-200',
                  'flex items-center gap-2 group',
                  isCurrent && 'bg-primary/10 border border-primary/25',
                  isCompleted && !isCurrent && 'hover:bg-secondary/60 cursor-pointer',
                  !isAccessible && 'opacity-35 cursor-not-allowed'
                )}
              >
                {/* Step number/status icon */}
                <div
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold transition-all',
                    isCompleted && 'bg-emerald-100 text-emerald-600',
                    isCurrent && 'bg-primary text-white shadow-sm',
                    !isCompleted && !isCurrent && 'bg-secondary text-muted-foreground text-[9px]'
                  )}
                >
                  {isCompleted ? <Check className="h-3 w-3" /> : String(step.id).padStart(2, '0')}
                </div>
                
                {/* Step details */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-xs font-medium truncate',
                    isCurrent && 'text-primary',
                    isCompleted && !isCurrent && 'text-foreground/80',
                    !isCompleted && !isCurrent && 'text-muted-foreground'
                  )}>
                    {step.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 truncate">
                    {step.description}
                  </p>
                </div>
                
                {isCurrent && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
        
        {/* Progress indicator */}
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between text-[10px] mb-1.5">
            <span className="text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary/60" />
              Progress
            </span>
            <span className="font-semibold text-foreground">{completedSteps.length}/8</span>
          </div>
          
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full progress-gradient transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {completedSteps.length === 8 && (
            <div className="mt-2 p-1.5 rounded bg-emerald-50 border border-emerald-200 text-center">
              <p className="text-[10px] font-medium text-emerald-600">🎉 Complete!</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
