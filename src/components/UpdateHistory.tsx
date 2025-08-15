import { Update } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UpdateHistoryProps {
  updates: Update[];
  currentUpdateId?: string;
  onSelectUpdate: (update: Update) => void;
  onDeleteUpdate: (id: string) => void;
}

export const UpdateHistory = ({ 
  updates, 
  currentUpdateId, 
  onSelectUpdate, 
  onDeleteUpdate 
}: UpdateHistoryProps) => {
  const getStatusIcon = (status: Update['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-warning" />;
    }
  };

  const getStatusBadge = (status: Update['status']) => {
    switch (status) {
      case 'pass':
        return <Badge variant="default" className="bg-success/20 text-success border-success/30">Pass</Badge>;
      case 'fail':
        return <Badge variant="destructive" className="bg-destructive/20">Fail</Badge>;
      default:
        return <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30">Pending</Badge>;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border bg-gradient-panel">
        <h2 className="text-lg font-semibold text-foreground">Update History</h2>
        <p className="text-sm text-muted-foreground">All previous updates and their status</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {updates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No updates yet</p>
            <p className="text-sm">Start by entering an idea above</p>
          </div>
        ) : (
          updates.map((update) => (
            <Card 
              key={update.id}
              className={cn(
                "p-3 cursor-pointer transition-all duration-200 hover:shadow-primary border",
                currentUpdateId === update.id 
                  ? "border-primary bg-primary/5 shadow-primary" 
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => onSelectUpdate(update)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(update.status)}
                  {getStatusBadge(update.status)}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteUpdate(update.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground line-clamp-2">
                  {update.summary || update.idea}
                </p>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{update.checklist.filter(item => item.status === 'pass').length}/{update.checklist.length} steps</span>
                  <span>{new Date(update.createdAt).toLocaleDateString()}</span>
                </div>
                
                {update.failureReason && (
                  <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1 mt-2">
                    {update.failureReason}
                  </p>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};