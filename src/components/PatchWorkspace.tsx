import { useState, useEffect, useRef } from 'react';
import { Update, ChecklistItem } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Copy, Play, CheckCircle, XCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PatchWorkspaceProps {
  currentUpdate: Update | null;
  onMarkPass: (stepId: string) => void;
  onMarkFail: (stepId: string, reason: string) => void;
  onGenerateNextPrompt: () => void;
  isGenerating: boolean;
}

export const PatchWorkspace = ({ 
  currentUpdate, 
  onMarkPass, 
  onMarkFail, 
  onGenerateNextPrompt,
  isGenerating 
}: PatchWorkspaceProps) => {
  const [failureReason, setFailureReason] = useState('');
  const [showFailureInput, setShowFailureInput] = useState(false);
  const [selectedStepId, setSelectedStepId] = useState<string>('');
  const { toast } = useToast();
  const reasonRef = useRef<HTMLTextAreaElement | null>(null);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "Patch prompt ready to paste into Copilot/Cursor",
      });
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please copy the text manually",
        variant: "destructive",
      });
    }
  };

  const handleMarkFail = (stepId: string) => {
    if (!failureReason.trim()) {
      // Inline gating; show helper text under the input and do nothing
      return;
    }

    onMarkFail(stepId, failureReason);
    setFailureReason('');
    setShowFailureInput(false);
    setSelectedStepId('');
  };

  const getCurrentStep = (): ChecklistItem | undefined => {
    if (!currentUpdate) return undefined;
    return currentUpdate.checklist.find(item => item.status === 'pending');
  };

  const currentStep = getCurrentStep();
  const allStepsComplete = currentUpdate?.checklist.every(item => item.status !== 'pending') ?? false;
  // Gating booleans for Build Next Prompt
  // hasFailed: any item is marked fail; hasReasonedFail: at least one failed item has a non-empty reason
  const hasFailed = !!currentUpdate?.checklist.some(i => i.status === 'fail');
  const hasReasonedFail = !!currentUpdate?.checklist.some(i => i.status === 'fail' && i.failureReason?.trim().length > 0);
  const activePrompt = currentUpdate?.updatedPrompt ?? currentUpdate?.promptUsed ?? '';

  // Autofocus the reason input when it first appears
  useEffect(() => {
    if (showFailureInput) {
      // Defer focus slightly to ensure element is mounted
      setTimeout(() => reasonRef.current?.focus(), 0);
    }
  }, [showFailureInput, selectedStepId]);

  const handleGenerate = () => {
    if (isGenerating || !hasFailed || !hasReasonedFail) return;
    onGenerateNextPrompt();
  };

  if (!currentUpdate) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-subtle">
        <div className="text-center text-muted-foreground">
          <Play className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No active update</p>
          <p className="text-sm">Select an update from history or create a new one</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border bg-gradient-panel">
        <h2 className="text-lg font-semibold text-foreground">Patch Workspace</h2>
        <p className="text-sm text-muted-foreground">
          Copy prompts to Copilot/Cursor and track progress
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Current Patch Prompt */}
        <Card className="p-4 bg-gradient-panel border-primary/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-foreground">Current Patch Prompt</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(activePrompt)}
              className="border-primary/30 hover:bg-primary/10"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </div>
          
          <div className="bg-secondary/50 rounded-lg p-3 font-mono text-sm">
            <pre className="whitespace-pre-wrap text-foreground">
              {activePrompt || 'No prompt generated yet'}
            </pre>
          </div>
        </Card>

        {/* Current Step Controls */}
        {currentStep && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30">
                Current Step
              </Badge>
              <h4 className="font-medium text-foreground">{currentStep.step}</h4>
            </div>
            
            <p className="text-sm text-muted-foreground mb-3">{currentStep.why}</p>
            <p className="text-sm text-foreground mb-4">
              <span className="font-medium">Expected:</span> {currentStep.expected}
            </p>

            <div className="flex gap-2">
              <Button
                onClick={() => onMarkPass(currentStep.id)}
                className="bg-success hover:bg-success/90 text-success-foreground"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Pass
              </Button>
              
              <Button
                variant="destructive"
                onClick={() => {
                  setSelectedStepId(currentStep.id);
                  setShowFailureInput(true);
                }}
                className="bg-destructive/90 hover:bg-destructive"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Mark Fail
              </Button>
            </div>

            {/* Failure Input */}
            {showFailureInput && selectedStepId === currentStep.id && (
              <div className="mt-4 space-y-3 p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                <Textarea
                  placeholder="Describe why this step failed (required)..."
                  value={failureReason}
                  onChange={(e) => setFailureReason(e.target.value)}
                  ref={reasonRef}
                  className="min-h-20 bg-background border-destructive/30"
                />
                {!failureReason.trim() && (
                  <p className="text-xs text-destructive mt-1">Reason is required</p>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleMarkFail(currentStep.id)}
                    disabled={!failureReason.trim()}
                  >
                    Confirm Failure
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowFailureInput(false);
                      setFailureReason('');
                      setSelectedStepId('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Generate Next Prompt */}
        {(allStepsComplete || currentUpdate.status === 'fail') && (
          <Card className="p-4 border-primary/30">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-foreground mb-1">Ready for Next Step</h4>
                <p className="text-sm text-muted-foreground">
                  {currentUpdate.status === 'fail' 
                    ? 'Generate refined prompt based on failures'
                    : 'All steps complete! Generate next iteration or mark as done.'
                  }
                </p>
              </div>
              
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !hasFailed || !hasReasonedFail}
                className="bg-gradient-primary hover:opacity-90"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                {isGenerating ? 'Generating...' : 'Build Next Prompt'}
              </Button>
            </div>
            {hasFailed && !hasReasonedFail && (
              <p className="text-xs text-destructive mt-2">Add a brief reason to at least one failed step to build the next prompt.</p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};