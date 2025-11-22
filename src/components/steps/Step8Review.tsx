'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Download, Copy, FileText } from 'lucide-react';
import { useAppStore } from '@/lib/store';

const mockArticleContent = `# Royal Enfield Classic 350 vs Bullet 350: A ₹20,000 Argument About Nothing

These are the same motorcycle. Same 349cc engine. Same frame...

[Full article content would go here]`;

export function Step8Review() {
  const setCurrentStep = useAppStore((state) => state.setCurrentStep);
  const [editMode, setEditMode] = useState(false);
  
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-3xl font-bold mb-2">Review & Publish</h2>
        <p className="text-slate-600">
          Final review before publishing your comparison article
        </p>
      </div>
      
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-slate-600 mb-1">Word Count</p>
          <p className="text-2xl font-bold">3,847</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-slate-600 mb-1">Reading Time</p>
          <p className="text-2xl font-bold">15 min</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-slate-600 mb-1">Owner Quotes</p>
          <p className="text-2xl font-bold">23</p>
        </div>
      </div>
      
      <div className="grid grid-cols-5 gap-6">
        {/* Left sidebar - Research data */}
        <div className="col-span-2 space-y-4">
          <Tabs defaultValue="personas">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="personas">Personas</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="verdicts">Verdicts</TabsTrigger>
            </TabsList>
            
            <ScrollArea className="h-[600px] rounded-lg border bg-white p-4 mt-4">
              <TabsContent value="personas" className="m-0">
                <h3 className="font-semibold mb-3">Identified Personas</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded text-sm">
                    <p className="font-medium">The Pillion-Heavy Commuter</p>
                    <p className="text-xs text-slate-600 mt-1">34% of owners</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded text-sm">
                    <p className="font-medium">The Weekend Thump Chaser</p>
                    <p className="text-xs text-slate-600 mt-1">28% of owners</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded text-sm">
                    <p className="font-medium">The First Big Bike Buyer</p>
                    <p className="text-xs text-slate-600 mt-1">23% of owners</p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="insights" className="m-0">
                <h3 className="font-semibold mb-3">Key Insights</h3>
                <p className="text-sm text-slate-600">
                  Click sections in the article to see supporting research data
                </p>
              </TabsContent>
              
              <TabsContent value="verdicts" className="m-0">
                <h3 className="font-semibold mb-3">Verdict Summary</h3>
                <p className="text-sm text-slate-600">
                  All persona-based recommendations with confidence scores
                </p>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
        
        {/* Right panel - Article */}
        <div className="col-span-3">
          <div className="bg-white rounded-lg border">
            <div className="border-b p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-600" />
                <h3 className="font-semibold">Final Article</h3>
                <Badge variant={editMode ? 'default' : 'outline'}>
                  {editMode ? 'Edit Mode: ON' : 'Read Only'}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditMode(!editMode)}
              >
                {editMode ? 'View Mode' : 'Edit Mode'}
              </Button>
            </div>
            
            <ScrollArea className="h-[600px] p-6">
              {editMode ? (
                <textarea
                  className="w-full min-h-[800px] font-mono text-sm border-none focus:outline-none resize-none"
                  defaultValue={mockArticleContent}
                />
              ) : (
                <div className="prose prose-slate max-w-none">
                  <div className="whitespace-pre-wrap">{mockArticleContent}</div>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="outline"
          size="lg"
          onClick={() => setCurrentStep(7)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Polish
        </Button>
        
        <div className="flex gap-2">
          <Button variant="outline" size="lg" className="gap-2">
            <Download className="h-4 w-4" />
            Export Markdown
          </Button>
          <Button variant="outline" size="lg" className="gap-2">
            <Copy className="h-4 w-4" />
            Copy to CMS
          </Button>
          <Button size="lg">
            Save as Draft
          </Button>
        </div>
      </div>
    </div>
  );
}

