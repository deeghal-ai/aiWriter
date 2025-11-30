/**
 * AppHeader Component
 * 
 * Modified to support:
 * - Back to home navigation
 * - Comparison title display
 * - Save status indicator
 * - New comparison button
 */

'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Bike, 
  Plus, 
  Save, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  Cloud,
  CloudOff
} from 'lucide-react';
import { useAppStore, useSaveStatus } from '@/lib/store';
import Image from 'next/image';

interface AppHeaderProps {
  showBackButton?: boolean;
  onBack?: () => void;
  title?: string;
  comparisonId?: string | null;
}

export function AppHeader({ 
  showBackButton = false, 
  onBack,
  title,
  comparisonId 
}: AppHeaderProps) {
  const router = useRouter();
  const { saveComparison, resetWorkflow } = useAppStore();
  const { isSaving, lastSaved, saveError } = useSaveStatus();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push('/');
    }
  };

  const handleNewComparison = () => {
    resetWorkflow();
    router.push('/comparison/new');
  };

  const handleManualSave = async () => {
    await saveComparison();
  };

  // Format last saved time
  const formatLastSaved = () => {
    if (!lastSaved) return null;
    const now = new Date();
    const diffMs = now.getTime() - lastSaved.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    
    if (diffSecs < 10) return 'Just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    return lastSaved.toLocaleTimeString();
  };

  // Render save status indicator
  const renderSaveStatus = () => {
    if (!comparisonId && !lastSaved) {
      // New unsaved comparison
      return (
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <CloudOff className="w-4 h-4" />
          <span>Not saved</span>
        </div>
      );
    }

    if (isSaving) {
      return (
        <div className="flex items-center gap-1.5 text-sm text-blue-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Saving...</span>
        </div>
      );
    }

    if (saveError) {
      return (
        <div className="flex items-center gap-1.5 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span>Save failed</span>
        </div>
      );
    }

    if (lastSaved) {
      return (
        <div className="flex items-center gap-1.5 text-sm text-green-600">
          <Cloud className="w-4 h-4" />
          <span>Saved {formatLastSaved()}</span>
        </div>
      );
    }

    return null;
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      {/* Left section */}
      <div className="flex items-center gap-4">
        {showBackButton && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBack}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        )}
        
        {/* Logo and title */}
        <div className="flex items-center gap-3">
          <Image 
            src="/bike_dekho_logo.png" 
            alt="BikeDekho Logo" 
            width={32} 
            height={32}
            className="object-contain"
          />
          
          {title ? (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">{title}</span>
              {comparisonId && (
                <Badge variant="outline" className="text-xs font-normal">
                  ID: {comparisonId.slice(0, 8)}...
                </Badge>
              )}
            </div>
          ) : (
            <span className="font-semibold text-gray-900">BikeDekho AI Writer</span>
          )}
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        {/* Save status */}
        {title && renderSaveStatus()}
        
        {/* Manual save button (only show if there's a comparison in progress) */}
        {title && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleManualSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1" />
            )}
            Save
          </Button>
        )}
        
        {/* New comparison button */}
        <Button 
          variant="default" 
          size="sm"
          onClick={handleNewComparison}
        >
          <Plus className="w-4 h-4 mr-1" />
          New Comparison
        </Button>
      </div>
    </header>
  );
}

export default AppHeader;
