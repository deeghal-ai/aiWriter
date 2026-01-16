'use client';

import { useEffect, useState, use } from 'react';
import { SharedContentView } from '@/components/shared/SharedContentView';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertCircle, FileX } from 'lucide-react';
import type { SingleVehiclePageContent } from '@/lib/types';

interface SharePageProps {
  params: Promise<{ token: string }>;
}

interface SharedContentData {
  vehicleName: string;
  content: SingleVehiclePageContent;
  lastUpdated: string;
}

export default function SharePage({ params }: SharePageProps) {
  const { token } = use(params);
  const [data, setData] = useState<SharedContentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSharedContent() {
      try {
        const response = await fetch(`/api/share/${token}`);
        const result = await response.json();

        if (!response.ok) {
          setError(result.error || 'Failed to load shared content');
          return;
        }

        setData({
          vehicleName: result.vehicleName,
          content: result.content,
          lastUpdated: result.lastUpdated
        });
      } catch (err) {
        console.error('Error fetching shared content:', err);
        setError('Failed to load shared content. Please check the link and try again.');
      } finally {
        setIsLoading(false);
      }
    }

    if (token) {
      fetchSharedContent();
    }
  }, [token]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Loader2 className="h-10 w-10 text-slate-400 animate-spin mb-4" />
              <h3 className="text-lg font-semibold text-slate-900">Loading Content</h3>
              <p className="text-slate-600 mt-1">Please wait while we fetch the shared content...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4 border-red-200">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 rounded-full bg-red-100 mb-4">
                {error.includes('not found') ? (
                  <FileX className="h-8 w-8 text-red-600" />
                ) : (
                  <AlertCircle className="h-8 w-8 text-red-600" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                {error.includes('not found') ? 'Content Not Found' : 'Error Loading Content'}
              </h3>
              <p className="text-slate-600 mt-1">{error}</p>
              <p className="text-sm text-slate-500 mt-4">
                The share link may have expired or the content may no longer be available.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No data state (shouldn't happen, but just in case)
  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <FileX className="h-10 w-10 text-slate-400 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900">No Content Available</h3>
              <p className="text-slate-600 mt-1">The shared content could not be loaded.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success - render the shared content
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Simple header for shared view */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">BD</span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Shared Content</p>
                <p className="text-xs text-slate-500">{data.vehicleName}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="py-8 px-4">
        <SharedContentView 
          content={data.content} 
          vehicleName={data.vehicleName}
          lastUpdated={data.lastUpdated}
        />
      </main>
    </div>
  );
}
