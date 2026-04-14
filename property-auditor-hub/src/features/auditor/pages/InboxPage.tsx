// ============================================
// INBOX PAGE
// Audit queue listing
// ============================================

import { SubmissionRepo } from '../repos/SubmissionRepo';

import { InboxItem } from '@udhbha/types';


export function InboxPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadQueue = async () => {
    setIsLoading(true);
    try {
      const queue = await SubmissionRepo.getQueue();
      setItems(queue);
    } catch (error) {
      console.error('Failed to load queue:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleReset = async () => {
    await SubmissionRepo.resetDemo();
    await loadQueue();
  };

  return (
    <>
      <AuditorHeader />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Audit Inbox</h1>
              <p className="text-muted-foreground">
                Review and audit submitted property registry revisions
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reset Demo
              </Button>
            </div>
          </div>

          {/* Queue table */}
          <InboxTable items={items} isLoading={isLoading} />
        </div>
      </div>
    </>
  );
}
