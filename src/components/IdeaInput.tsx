import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Lightbulb } from 'lucide-react';

interface IdeaInputProps {
  onSubmitIdea: (idea: string) => void;
  isGenerating: boolean;
}

export const IdeaInput = ({ onSubmitIdea, isGenerating }: IdeaInputProps) => {
  const [idea, setIdea] = useState('');

  const handleSubmit = () => {
    if (idea.trim()) {
      onSubmitIdea(idea.trim());
      // Clear after submission completes in parent; keep text until then
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Card className="p-4 bg-gradient-panel border-primary/20 shadow-panel">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="h-5 w-5 text-primary" />
        <h3 className="font-medium text-foreground">New Idea</h3>
      </div>
      
      <div className="space-y-3">
        <Textarea
          placeholder="Describe what you want to implement... (Cmd/Ctrl+Enter to submit)"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-24 resize-none bg-background border-border focus:border-primary"
          disabled={isGenerating}
        />
        
        <div className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground">
            Be specific about the feature or fix you want to implement
          </p>
          
          <Button
            onClick={handleSubmit}
            disabled={!idea.trim() || isGenerating}
            className="bg-gradient-primary hover:opacity-90"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Plan...
              </>
            ) : (
              'Generate Plan'
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};