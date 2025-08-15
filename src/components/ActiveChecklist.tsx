import { useState } from 'react';
import { Update, ChecklistItem, Heuristic, QuickEditData } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Clock, Star, Zap, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuickEdits } from './QuickEdits';

interface ActiveChecklistProps {
  currentUpdate: Update | null;
  heuristics: Heuristic[];
  onCreateQuickEdit: (quickEditData: QuickEditData) => void;
  isGenerating: boolean;
}

export const ActiveChecklist = ({ currentUpdate, heuristics, onCreateQuickEdit, isGenerating }: ActiveChecklistProps) => {
  const getStatusIcon = (status: ChecklistItem['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-warning" />;
    }
  };

  const getStatusColor = (status: ChecklistItem['status']) => {
    switch (status) {
      case 'pass':
        return 'border-success/30 bg-success/5';
      case 'fail':
        return 'border-destructive/30 bg-destructive/5';
      default:
        return 'border-warning/30 bg-warning/5';
    }
  };

  const topHeuristics = heuristics
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="checklist" className="h-full flex flex-col">
        <div className="p-4 border-b border-border bg-gradient-panel">
          <TabsList className="grid w-full grid-cols-2 mb-3">
            <TabsTrigger value="checklist" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Checklist
            </TabsTrigger>
            <TabsTrigger value="quick-edits" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Quick Edits
            </TabsTrigger>
          </TabsList>
          <p className="text-sm text-muted-foreground">
            Track progress and make surgical edits
          </p>
        </div>

        <TabsContent value="checklist" className="flex-1 overflow-y-auto p-4 space-y-4 mt-0">
          {!currentUpdate ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No active checklist</p>
              <p className="text-sm">Create an update to see checklist</p>
            </div>
          ) : (
            <>
              {/* Plan Summary */}
              <Card className="p-4 bg-gradient-subtle border-primary/20">
                <h3 className="font-medium text-foreground mb-2">Plan</h3>
                <p className="text-sm text-muted-foreground">{currentUpdate.plan}</p>
              </Card>

              {/* Checklist Items */}
              <div className="space-y-3">
                <h3 className="font-medium text-foreground">Steps</h3>
                {currentUpdate.checklist.map((item, index) => (
                  <Card 
                    key={item.id}
                    className={cn(
                      "p-3 transition-all duration-200",
                      getStatusColor(item.status)
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-mono bg-secondary rounded px-1.5 py-0.5">
                          {index + 1}
                        </span>
                        {getStatusIcon(item.status)}
                      </div>
                      
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          {item.step}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Why:</span> {item.why}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Expected:</span> {item.expected}
                        </p>
                        
                        {item.failureReason && (
                          <div className="mt-2 p-2 bg-destructive/10 rounded border border-destructive/20">
                            <p className="text-xs text-destructive">
                              <span className="font-medium">Failed:</span> {item.failureReason}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* What Worked Section */}
              {topHeuristics.length > 0 && (
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="h-4 w-4 text-warning" />
                    <h3 className="font-medium text-foreground">What Worked</h3>
                  </div>
                  
                  <div className="space-y-2">
                    {topHeuristics.map((heuristic) => (
                      <div 
                        key={heuristic.id}
                        className="flex items-center justify-between p-2 bg-secondary/30 rounded text-sm"
                      >
                        <span className="text-foreground">{heuristic.pattern}</span>
                        <Badge variant="secondary" className="text-xs">
                          {heuristic.score}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="quick-edits" className="flex-1 mt-0">
          <QuickEdits 
            onCreateQuickEdit={onCreateQuickEdit}
            isGenerating={isGenerating}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};