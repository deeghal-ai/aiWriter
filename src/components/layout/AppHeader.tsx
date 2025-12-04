'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Save, Loader2, Cloud, CloudOff, AlertTriangle } from 'lucide-react';
import { useAppStore, useSaveStatus } from '@/lib/store';
import Image from 'next/image';

interface AppHeaderProps {
  showBackButton?: boolean;
  onBack?: () => void;
  title?: string;
  comparisonId?: string | null;
}

export function AppHeader({ showBackButton = false, onBack, title, comparisonId }: AppHeaderProps) {
  const router = useRouter();
  const { saveComparison, resetWorkflow } = useAppStore();
  const { isSaving, lastSaved, saveError } = useSaveStatus();

  const handleBack = () => onBack ? onBack() : router.push('/');
  const handleNewComparison = () => { resetWorkflow(); router.push('/comparison/new'); };
  const handleManualSave = async () => { await saveComparison(); };

  const formatLastSaved = () => {
    if (!lastSaved) return null;
    const diffSecs = Math.floor((new Date().getTime() - lastSaved.getTime()) / 1000);
    if (diffSecs < 10) return 'Just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;
    return `${Math.floor(diffSecs / 60)}m ago`;
  };

  const renderSaveStatus = () => {
    if (!comparisonId && !lastSaved) {
      return (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground px-2 py-1 rounded bg-secondary/80">
          <CloudOff className="w-3 h-3" />
          <span>Not saved</span>
        </div>
      );
    }
    if (isSaving) {
      return (
        <div className="flex items-center gap-1.5 text-[11px] text-amber-600 px-2 py-1 rounded bg-amber-50">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Saving...</span>
        </div>
      );
    }
    if (saveError) {
      return (
        <div className="flex items-center gap-1.5 text-[11px] text-destructive px-2 py-1 rounded bg-destructive/10">
          <AlertTriangle className="w-3 h-3" />
          <span>Failed</span>
        </div>
      );
    }
    if (lastSaved) {
      return (
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 px-2 py-1 rounded bg-emerald-50">
          <Cloud className="w-3 h-3" />
          <span>Saved {formatLastSaved()}</span>
        </div>
      );
    }
    return null;
  };

  return (
    <header className="bg-white border-b border-border/50 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {showBackButton && (
          <Button variant="ghost" size="sm" onClick={handleBack} className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back
          </Button>
        )}
        
        <div className="flex items-center gap-2">
          <div className="bg-white p-1 rounded border border-border/50 shadow-sm">
            <Image src="/bike_dekho_logo.png" alt="Logo" width={22} height={22} className="object-contain" />
          </div>
          
          {title ? (
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-foreground">{title}</span>
              {comparisonId && (
                <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 h-4">
                  {comparisonId.slice(0, 8)}
                </Badge>
              )}
            </div>
          ) : (
            <span className="font-medium text-sm text-foreground">BikeDekho AI Writer</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {title && renderSaveStatus()}
        
        {title && (
          <Button variant="outline" size="sm" onClick={handleManualSave} disabled={isSaving} className="h-7 px-2.5 text-xs">
            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            <span className="ml-1">Save</span>
          </Button>
        )}
        
        <Button size="sm" onClick={handleNewComparison} className="h-7 px-2.5 text-xs">
          <Plus className="w-3 h-3 mr-1" />
          New Comparison
        </Button>
      </div>
    </header>
  );
}

export default AppHeader;
