/**
 * Homepage - Comparison List
 * 
 * Displays all saved comparisons with progress indicators.
 * Allows creating new comparisons and continuing existing ones.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  FileText, 
  Clock, 
  CheckCircle2, 
  Trash2, 
  Loader2,
  AlertCircle,
  Bike
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Types
interface ComparisonSummary {
  id: string;
  bike1_name: string;
  bike2_name: string;
  display_name: string | null;
  current_step: number | null;
  completed_steps: number[] | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// Step names for display
const STEP_NAMES = [
  'Input', 
  'Scrape', 
  'Extract', 
  'Personas', 
  'Verdicts', 
  'Article', 
  'Polish', 
  'Review'
];

export default function HomePage() {
  const [comparisons, setComparisons] = useState<ComparisonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  // Fetch comparisons on mount
  useEffect(() => {
    fetchComparisons();
  }, []);

  const fetchComparisons = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch('/api/comparisons');
      
      if (!res.ok) {
        throw new Error('Failed to fetch comparisons');
      }
      
      const result = await res.json();
      setComparisons(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching comparisons:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewComparison = () => {
    router.push('/comparison/new');
  };

  const handleOpenComparison = (id: string) => {
    router.push(`/comparison/${id}`);
  };

  const handleDeleteComparison = async (id: string) => {
    try {
      setDeletingId(id);
      
      const res = await fetch(`/api/comparisons/${id}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        throw new Error('Failed to delete comparison');
      }
      
      // Remove from local state
      setComparisons(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting comparison:', err);
      alert('Failed to delete comparison');
    } finally {
      setDeletingId(null);
    }
  };

  const getProgressPercentage = (completedSteps: number[] | null) => {
    if (!completedSteps || completedSteps.length === 0) return 0;
    return Math.round((completedSteps.length / 8) * 100);
  };

  const getStatusBadge = (status: string | null, completedSteps: number[] | null) => {
    const steps = completedSteps || [];
    
    if (status === 'completed' || steps.length === 8) {
      return <Badge className="bg-green-500 hover:bg-green-600">Completed</Badge>;
    }
    if (status === 'archived') {
      return <Badge variant="secondary">Archived</Badge>;
    }
    if (steps.length > 0) {
      return <Badge className="bg-blue-500 hover:bg-blue-600">In Progress</Badge>;
    }
    return <Badge variant="outline">Draft</Badge>;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bike className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">BikeDekho AI Writer</h1>
              <p className="text-gray-600 mt-1">Create research-driven bike comparison articles</p>
            </div>
          </div>
          <Button onClick={handleNewComparison} size="lg">
            <Plus className="w-5 h-5 mr-2" />
            New Comparison
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-700">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchComparisons}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
            <p className="text-gray-500">Loading comparisons...</p>
          </div>
        ) : comparisons.length === 0 ? (
          /* Empty State */
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No comparisons yet</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Start by creating your first bike comparison. Our AI will help you research 
                and write a comprehensive article.
              </p>
              <Button onClick={handleNewComparison} size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Comparison
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Comparisons Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comparisons.map((comparison) => (
              <Card 
                key={comparison.id} 
                className="group cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-blue-200"
                onClick={() => handleOpenComparison(comparison.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg leading-tight pr-2">
                      {comparison.display_name || `${comparison.bike1_name} vs ${comparison.bike2_name}`}
                    </CardTitle>
                    {getStatusBadge(comparison.status, comparison.completed_steps)}
                  </div>
                  <CardDescription className="flex items-center gap-2 text-sm">
                    <Clock className="w-3 h-3" />
                    Updated {formatDate(comparison.updated_at)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-sm text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>{getProgressPercentage(comparison.completed_steps)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getProgressPercentage(comparison.completed_steps)}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Current step indicator */}
                  <div className="text-sm text-gray-600 mb-3">
                    {comparison.completed_steps?.length === 8 ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="w-4 h-4" />
                        All steps completed
                      </span>
                    ) : (
                      <>
                        Current: <span className="font-medium text-gray-900">
                          Step {comparison.current_step || 1} - {STEP_NAMES[(comparison.current_step || 1) - 1]}
                        </span>
                      </>
                    )}
                  </div>
                  
                  {/* Step progress pills */}
                  <div className="flex gap-1 mb-3">
                    {STEP_NAMES.map((name, idx) => (
                      <div 
                        key={idx}
                        className={`flex-1 h-1.5 rounded-full transition-colors ${
                          comparison.completed_steps?.includes(idx + 1) 
                            ? 'bg-green-500' 
                            : (comparison.current_step || 1) === idx + 1
                            ? 'bg-blue-500'
                            : 'bg-gray-200'
                        }`}
                        title={`${name}${comparison.completed_steps?.includes(idx + 1) ? ' ✓' : ''}`}
                      />
                    ))}
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenComparison(comparison.id);
                      }}
                    >
                      {comparison.completed_steps?.length === 8 ? 'View' : 'Continue'}
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                          onClick={(e) => e.stopPropagation()}
                          disabled={deletingId === comparison.id}
                        >
                          {deletingId === comparison.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Comparison?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete &quot;{comparison.display_name || `${comparison.bike1_name} vs ${comparison.bike2_name}`}&quot; 
                            and all its data. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => handleDeleteComparison(comparison.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats Footer */}
        {!loading && comparisons.length > 0 && (
          <div className="mt-8 text-center text-sm text-gray-500">
            {comparisons.length} comparison{comparisons.length !== 1 ? 's' : ''} • 
            {comparisons.filter(c => c.status === 'completed' || c.completed_steps?.length === 8).length} completed
          </div>
        )}
      </div>
    </div>
  );
}
