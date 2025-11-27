import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import Image from 'next/image';

export function AppHeader() {
  const resetWorkflow = useAppStore((state) => state.resetWorkflow);
  
  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Image 
            src="/bike_dekho_logo.png" 
            alt="BikeDekho Logo" 
            width={40} 
            height={40}
            className="object-contain"
          />
          <h1 className="text-xl font-semibold">BikeDekho AI Writer</h1>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={resetWorkflow}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          New Comparison
        </Button>
      </div>
    </header>
  );
}

