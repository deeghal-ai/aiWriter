/**
 * Homepage - Comparison List
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Clock, CheckCircle2, Trash2, Loader2, AlertCircle, Sparkles, ArrowRight, Zap } from 'lucide-react';
import Image from 'next/image';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

const STEP_NAMES = ['Input', 'Scrape', 'Extract', 'Personas', 'Verdicts', 'Article', 'Polish', 'Review'];

export default function HomePage() {
  const [comparisons, setComparisons] = useState<ComparisonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => { fetchComparisons(); }, []);

  const fetchComparisons = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/comparisons');
      if (!res.ok) throw new Error('Failed to fetch');
      const result = await res.json();
      setComparisons(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleNewComparison = () => router.push('/comparison/new');
  const handleOpenComparison = (id: string) => router.push(`/comparison/${id}`);

  const handleDeleteComparison = async (id: string) => {
    try {
      setDeletingId(id);
      const res = await fetch(`/api/comparisons/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setComparisons(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const getProgress = (steps: number[] | null) => steps?.length ? Math.round((steps.length / 8) * 100) : 0;

  const getStatusBadge = (status: string | null, steps: number[] | null) => {
    const completed = steps || [];
    if (status === 'completed' || completed.length === 8) {
      return <Badge variant="success" className="text-[10px] px-1.5 py-0"><CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />Done</Badge>;
    }
    if (status === 'archived') return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Archived</Badge>;
    if (completed.length > 0) return <Badge variant="warning" className="text-[10px] px-1.5 py-0"><Zap className="w-2.5 h-2.5 mr-0.5" />Active</Badge>;
    return <Badge variant="outline" className="text-[10px] px-1.5 py-0">Draft</Badge>;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    const diffMs = new Date().getTime() - new Date(dateString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    return `${Math.floor(diffHours / 24)}d`;
  };

  return (
    <div className="min-h-screen bg-background bg-gradient-mesh relative">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-32 w-64 h-64 bg-[hsl(85,25%,45%)]/5 rounded-full blur-3xl" />
      </div>
      
      <div className="relative max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-8 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/10 rounded-xl blur-lg" />
              <div className="relative bg-white p-2 rounded-xl border border-border/50 shadow-soft">
                <Image src="/bike_dekho_logo.png" alt="Logo" width={36} height={36} className="object-contain" priority />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold">
                <span className="text-gradient">BikeDekho</span>
                <span className="text-foreground"> AI Writer</span>
              </h1>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary" />
                Research-driven bike comparison articles
              </p>
            </div>
          </div>
          
          <Button onClick={handleNewComparison} size="sm" className="h-8 px-3 text-xs gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            New Comparison
          </Button>
        </header>

        {/* Error State */}
        {error && (
          <Card className="mb-4 border-destructive/40 bg-destructive/5">
            <CardContent className="flex items-center gap-3 py-2 px-3">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <p className="text-xs text-destructive flex-1">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchComparisons} className="h-6 px-2 text-[10px]">Retry</Button>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground mt-3">Loading...</p>
          </div>
        ) : comparisons.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16 animate-fade-in-up">
            <div className="bg-white rounded-2xl p-6 shadow-soft border border-border/50 mb-4">
              <FileText className="w-12 h-12 text-muted-foreground/30" />
            </div>
            <h3 className="text-base font-medium text-foreground mb-1">No comparisons yet</h3>
            <p className="text-xs text-muted-foreground text-center max-w-sm mb-4">
              Create your first bike comparison. AI will research and write a comprehensive article.
            </p>
            <Button onClick={handleNewComparison} size="sm" className="h-8 px-4 text-xs gap-2">
              <Plus className="w-3.5 h-3.5" />
              Create First Comparison
            </Button>
          </div>
        ) : (
          /* Comparisons Grid */
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-medium text-foreground/70">Your Comparisons</h2>
              <span className="text-[10px] text-muted-foreground">{comparisons.length} total</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {comparisons.map((comparison, index) => (
                <Card 
                  key={comparison.id} 
                  className="group cursor-pointer card-hover animate-fade-in-up opacity-0"
                  style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'forwards' }}
                  onClick={() => handleOpenComparison(comparison.id)}
                >
                  <CardHeader className="p-3 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-xs font-medium leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {comparison.display_name || `${comparison.bike1_name} vs ${comparison.bike2_name}`}
                      </CardTitle>
                      {getStatusBadge(comparison.status, comparison.completed_steps)}
                    </div>
                    <CardDescription className="flex items-center gap-1 text-[10px]">
                      <Clock className="w-2.5 h-2.5" />
                      {formatDate(comparison.updated_at)}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="p-3 pt-0 space-y-2">
                    {/* Progress */}
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{getProgress(comparison.completed_steps)}%</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-1">
                        <div className="h-full progress-gradient rounded-full transition-all" style={{ width: `${getProgress(comparison.completed_steps)}%` }} />
                      </div>
                    </div>
                    
                    {/* Current step */}
                    <div className="text-[10px]">
                      {comparison.completed_steps?.length === 8 ? (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 className="w-3 h-3" />Complete
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          Step {comparison.current_step || 1}: <span className="text-foreground">{STEP_NAMES[(comparison.current_step || 1) - 1]}</span>
                        </span>
                      )}
                    </div>
                    
                    {/* Step pills */}
                    <div className="flex gap-0.5">
                      {STEP_NAMES.map((_, idx) => {
                        const stepNum = idx + 1;
                        const isCurrent = (comparison.current_step || 1) === stepNum;
                        const isCompleted = comparison.completed_steps?.includes(stepNum);
                        return (
                          <div 
                            key={idx}
                            className={`flex-1 h-1 rounded-full ${isCurrent ? 'bg-primary' : isCompleted ? 'bg-emerald-500' : 'bg-secondary'}`}
                          />
                        );
                      })}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-primary hover:text-primary/80 gap-1"
                        onClick={(e) => { e.stopPropagation(); handleOpenComparison(comparison.id); }}>
                        {comparison.completed_steps?.length === 8 ? 'View' : 'Continue'}
                        <ArrowRight className="w-2.5 h-2.5" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={(e) => e.stopPropagation()} disabled={deletingId === comparison.id}>
                            {deletingId === comparison.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent onClick={(e) => e.stopPropagation()} className="max-w-sm">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-sm">Delete?</AlertDialogTitle>
                            <AlertDialogDescription className="text-xs">
                              This will permanently delete this comparison.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="h-7 text-xs">Cancel</AlertDialogCancel>
                            <AlertDialogAction className="h-7 text-xs bg-destructive hover:bg-destructive/90" onClick={() => handleDeleteComparison(comparison.id)}>
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
            
            {/* Stats */}
            <div className="mt-6 text-center">
              <p className="text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 mr-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  {comparisons.filter(c => c.status !== 'completed' && c.completed_steps?.length !== 8).length} active
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {comparisons.filter(c => c.status === 'completed' || c.completed_steps?.length === 8).length} done
                </span>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
