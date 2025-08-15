import { useState } from 'react';
import { QuickEditData, Update } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Zap, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface QuickEditsProps {
  onCreateQuickEdit: (quickEditData: QuickEditData) => void;
  isGenerating: boolean;
}

export const QuickEdits = ({ onCreateQuickEdit, isGenerating }: QuickEditsProps) => {
  const [file, setFile] = useState('');
  const [anchor, setAnchor] = useState('');
  const [before, setBefore] = useState('');
  const [after, setAfter] = useState('');
  const [scope, setScope] = useState<'single' | 'selected' | 'all'>('single');
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const generateDiff = () => {
    if (!before.trim() || !after.trim()) return '';
    
    return `--- ${file}
+++ ${file}
@@ -1,1 +1,1 @@
-${before}
+${after}`;
  };

  const generateMicroPrompt = (data: QuickEditData) => {
    const changeType = data.before.includes('className') || data.before.includes('class=') 
      ? 'style change' 
      : 'text change';
      
    return `Surgical change: In ${data.file}, ${data.anchor ? `within ${data.anchor}` : 'at the specified location'}, change "${data.before}" to "${data.after}".

Only update this specific ${changeType}. Don't alter props, keys, routes, logic, or other styling.
Scope: ${data.scope === 'single' ? 'This occurrence only' : data.scope === 'selected' ? 'Selected occurrences' : 'All occurrences in this file'}.

If a test is easy, adjust one minimal test. Keep diff small.`;
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: `${label} copied`,
        description: "Ready to paste into your editor",
      });
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please copy the text manually",
        variant: "destructive",
      });
    }
  };

  const handleCreateEdit = () => {
    if (!file.trim() || !before.trim() || !after.trim()) {
      toast({
        title: "Missing required fields",
        description: "Please fill in file, before, and after text",
        variant: "destructive",
      });
      return;
    }

    const diffPreview = generateDiff();
    const occurrenceCount = scope === 'single' ? 1 : scope === 'selected' ? 2 : 3; // Mock count

    const quickEditData: QuickEditData = {
      file,
      anchor,
      before,
      after,
      occurrenceCount,
      diffPreview,
      scope
    };

    onCreateQuickEdit(quickEditData);
    setShowPreview(true);
  };

  const handleReset = () => {
    setFile('');
    setAnchor('');
    setBefore('');
    setAfter('');
    setScope('single');
    setShowPreview(false);
  };

  const diff = generateDiff();
  const mockQuickEditData: QuickEditData = {
    file,
    anchor,
    before,
    after,
    occurrenceCount: 1,
    diffPreview: diff,
    scope
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border bg-gradient-panel">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-5 w-5 text-warning" />
          <h2 className="text-lg font-semibold text-foreground">Quick Edits</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Fast, surgical micro-changes with precise control
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Input Form */}
        <Card className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">Target File</Label>
            <Input
              id="file"
              placeholder="src/components/Button.tsx"
              value={file}
              onChange={(e) => setFile(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="anchor">Anchor (optional)</Label>
            <Input
              id="anchor"
              placeholder="function Button() or line 42"
              value={anchor}
              onChange={(e) => setAnchor(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="before">Before</Label>
              <Textarea
                id="before"
                placeholder="text-sm"
                value={before}
                onChange={(e) => setBefore(e.target.value)}
                className="font-mono text-sm min-h-20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="after">After</Label>
              <Textarea
                id="after"
                placeholder="text-base"
                value={after}
                onChange={(e) => setAfter(e.target.value)}
                className="font-mono text-sm min-h-20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Scope</Label>
            <Select value={scope} onValueChange={(value: 'single' | 'selected' | 'all') => setScope(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">This occurrence only</SelectItem>
                <SelectItem value="selected">Selected occurrences</SelectItem>
                <SelectItem value="all">All occurrences in file</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleCreateEdit}
              disabled={isGenerating || !file.trim() || !before.trim() || !after.trim()}
              className="bg-warning hover:bg-warning/90 text-warning-foreground"
            >
              <Zap className="h-4 w-4 mr-2" />
              Stage Edit
            </Button>
            
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isGenerating}
            >
              Reset
            </Button>
          </div>
        </Card>

        {/* Guardrails Warning */}
        <Card className="p-3 bg-warning/5 border-warning/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-warning mb-1">Guardrails Active</p>
              <ul className="text-muted-foreground space-y-0.5 text-xs">
                <li>• Max 30 lines, 3 files per edit</li>
                <li>• No imports, logic, or routes</li>
                <li>• Text/labels and small UI tweaks only</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Diff Preview */}
        {showPreview && diff && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-foreground">Diff Preview</h3>
              <Badge variant="secondary" className="text-xs">
                {mockQuickEditData.occurrenceCount} occurrence{mockQuickEditData.occurrenceCount !== 1 ? 's' : ''}
              </Badge>
            </div>
            
            <div className="bg-secondary/30 rounded-lg p-3 font-mono text-sm">
              <pre className="whitespace-pre-wrap text-foreground">
                {diff}
              </pre>
            </div>

            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(diff, 'Patch')}
                className="border-primary/30"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Patch
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(generateMicroPrompt(mockQuickEditData), 'Cursor Prompt')}
                className="border-accent/30"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Cursor Prompt
              </Button>
            </div>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="p-3">
          <h4 className="font-medium text-foreground mb-2">Quick Actions</h4>
          <div className="text-xs text-muted-foreground space-y-1">
            <p><kbd className="px-1.5 py-0.5 bg-secondary rounded">Enter</kbd> Confirm field</p>
            <p><kbd className="px-1.5 py-0.5 bg-secondary rounded">Cmd/Ctrl+Enter</kbd> Stage diff</p>
            <p><kbd className="px-1.5 py-0.5 bg-secondary rounded">Alt+P</kbd> Copy Cursor prompt</p>
          </div>
        </Card>
      </div>
    </div>
  );
};