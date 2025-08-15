import { useState, useEffect } from 'react';
import { Update, ChecklistItem, Heuristic } from '@/types';
import { storage } from '@/lib/storage';
import { llmService } from '@/lib/llm-service';
import { UpdateHistory } from '@/components/UpdateHistory';
import { PatchWorkspace } from '@/components/PatchWorkspace';
import { ActiveChecklist } from '@/components/ActiveChecklist';
import { IdeaInput } from '@/components/IdeaInput';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [currentUpdate, setCurrentUpdate] = useState<Update | null>(null);
  const [heuristics, setHeuristics] = useState<Heuristic[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Load data on mount
  useEffect(() => {
    const savedUpdates = storage.getUpdates();
    const savedHeuristics = storage.getHeuristics();
    const savedCurrent = storage.getCurrentUpdate();
    
    setUpdates(savedUpdates);
    setHeuristics(savedHeuristics);
    setCurrentUpdate(savedCurrent);
  }, []);

  const generateUniqueId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const handleSubmitIdea = async (idea: string) => {
    setIsGenerating(true);
    
    try {
      const failureTags = updates
        .filter(u => u.status === 'fail')
        .map(u => u.failureReason)
        .filter(Boolean) as string[];
        
      const heuristicPatterns = heuristics
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(h => h.pattern);

      const planResponse = await llmService.generatePlan(idea, failureTags, heuristicPatterns);
      
      const checklistItems: ChecklistItem[] = planResponse.checklist.map(item => ({
        id: generateUniqueId(),
        step: item.step,
        why: item.why,
        expected: item.expected,
        status: 'pending' as const
      }));

      const firstStep = checklistItems[0];
      const initialPrompt = firstStep 
        ? await llmService.generatePatchPrompt(firstStep, planResponse.surgical_constraints)
        : '';

      const newUpdate: Update = {
        id: generateUniqueId(),
        idea,
        plan: planResponse.plan,
        checklist: checklistItems,
        status: 'pending',
        promptUsed: initialPrompt,
        summary: `Implement: ${idea.slice(0, 60)}${idea.length > 60 ? '...' : ''}`,
        createdAt: new Date().toISOString()
      };

      setUpdates(prev => [newUpdate, ...prev]);
      setCurrentUpdate(newUpdate);
      storage.saveUpdate(newUpdate);
      storage.setCurrentUpdate(newUpdate);

      toast({
        title: "Plan generated",
        description: "Ready to copy patch prompt to Copilot/Cursor",
      });
    } catch (error) {
      toast({
        title: "Failed to generate plan",
        description: "Please try again with a different approach",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectUpdate = (update: Update) => {
    setCurrentUpdate(update);
    storage.setCurrentUpdate(update);
  };

  const handleDeleteUpdate = (id: string) => {
    setUpdates(prev => prev.filter(u => u.id !== id));
    storage.deleteUpdate(id);
    
    if (currentUpdate?.id === id) {
      setCurrentUpdate(null);
      storage.setCurrentUpdate(null);
    }
  };

  const handleMarkPass = (stepId: string) => {
    if (!currentUpdate) return;

    const updatedChecklist = currentUpdate.checklist.map(item =>
      item.id === stepId ? { ...item, status: 'pass' as const } : item
    );

    const allPassed = updatedChecklist.every(item => item.status === 'pass');
    const updatedUpdate: Update = {
      ...currentUpdate,
      checklist: updatedChecklist,
      status: allPassed ? 'pass' : 'pending'
    };

    setCurrentUpdate(updatedUpdate);
    setUpdates(prev => prev.map(u => u.id === updatedUpdate.id ? updatedUpdate : u));
    storage.saveUpdate(updatedUpdate);
    storage.setCurrentUpdate(updatedUpdate);

    // Add heuristic if step passed
    const passedStep = updatedChecklist.find(item => item.id === stepId);
    if (passedStep) {
      const heuristic: Heuristic = {
        id: generateUniqueId(),
        pattern: `${passedStep.step} - ${passedStep.why}`,
        score: 1,
        createdAt: new Date().toISOString()
      };
      storage.saveHeuristic(heuristic);
      setHeuristics(prev => [...prev, heuristic]);
    }
  };

  const handleMarkFail = (stepId: string, reason: string) => {
    if (!currentUpdate) return;

    const updatedChecklist = currentUpdate.checklist.map(item =>
      item.id === stepId ? { ...item, status: 'fail' as const, failureReason: reason } : item
    );

    const updatedUpdate: Update = {
      ...currentUpdate,
      checklist: updatedChecklist,
      status: 'fail',
      failureReason: reason
    };

    setCurrentUpdate(updatedUpdate);
    setUpdates(prev => prev.map(u => u.id === updatedUpdate.id ? updatedUpdate : u));
    storage.saveUpdate(updatedUpdate);
    storage.setCurrentUpdate(updatedUpdate);
  };

  const handleGenerateNextPrompt = async () => {
    if (!currentUpdate) return;

    setIsGenerating(true);
    
    try {
      const nextPendingStep = currentUpdate.checklist.find(item => item.status === 'pending');
      
      if (nextPendingStep) {
        // Generate prompt for next step
        const constraints = ["Keep existing patterns", "Minimal changes only", "Preserve working code"];
        const prompt = await llmService.generatePatchPrompt(nextPendingStep, constraints);
        
        const updatedUpdate: Update = {
          ...currentUpdate,
          promptUsed: prompt
        };

        setCurrentUpdate(updatedUpdate);
        setUpdates(prev => prev.map(u => u.id === updatedUpdate.id ? updatedUpdate : u));
        storage.saveUpdate(updatedUpdate);
        storage.setCurrentUpdate(updatedUpdate);
      } else {
        // Refine based on failures
        const failureReasons = currentUpdate.checklist
          .filter(item => item.status === 'fail')
          .map(item => item.failureReason)
          .filter(Boolean) as string[];

        if (failureReasons.length > 0) {
          const heuristicPatterns = heuristics.map(h => h.pattern);
          const refinedResponse = await llmService.refinePrompt(
            currentUpdate.summary,
            `${currentUpdate.checklist.filter(i => i.status === 'pass').length}/${currentUpdate.checklist.length} passed`,
            failureReasons,
            heuristicPatterns
          );

          const updatedUpdate: Update = {
            ...currentUpdate,
            promptUsed: refinedResponse.updated_prompt,
            updatedPrompt: refinedResponse.updated_prompt
          };

          setCurrentUpdate(updatedUpdate);
          setUpdates(prev => prev.map(u => u.id === updatedUpdate.id ? updatedUpdate : u));
          storage.saveUpdate(updatedUpdate);
          storage.setCurrentUpdate(updatedUpdate);
        }
      }

      toast({
        title: "Prompt updated",
        description: "New patch prompt ready to copy",
      });
    } catch (error) {
      toast({
        title: "Failed to generate prompt",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-gradient-panel shadow-subtle">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-foreground">Execution Notepad</h1>
          <p className="text-sm text-muted-foreground">
            Lock into the loop: idea → plan → execute → test → refine
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Update History */}
        <div className="w-80 border-r border-border bg-gradient-subtle">
          <UpdateHistory
            updates={updates}
            currentUpdateId={currentUpdate?.id}
            onSelectUpdate={handleSelectUpdate}
            onDeleteUpdate={handleDeleteUpdate}
          />
        </div>

        {/* Center Panel - Patch Workspace */}
        <div className="flex-1 flex flex-col">
          {/* Idea Input */}
          <div className="p-4 border-b border-border">
            <IdeaInput
              onSubmitIdea={handleSubmitIdea}
              isGenerating={isGenerating}
            />
          </div>

          {/* Workspace */}
          <div className="flex-1">
            <PatchWorkspace
              currentUpdate={currentUpdate}
              onMarkPass={handleMarkPass}
              onMarkFail={handleMarkFail}
              onGenerateNextPrompt={handleGenerateNextPrompt}
              isGenerating={isGenerating}
            />
          </div>
        </div>

        {/* Right Panel - Active Checklist */}
        <div className="w-80 border-l border-border bg-gradient-subtle">
          <ActiveChecklist
            currentUpdate={currentUpdate}
            heuristics={heuristics}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
