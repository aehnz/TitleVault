// ============================================
// SEARCH BAR
// Mode selector and input for public search
// ============================================

import { Alert, AlertDescription } from '@/components/ui/alert';

import { ParsedSearchInput, SearchMode } from '@udhbha/types';


interface SearchBarProps {
  onSearch: (mode: SearchMode, input: string, secondaryInput?: string) => void;
  isLoading?: boolean;
  initialMode?: SearchMode;
  initialInput?: string;
}

export function SearchBar({ 
  onSearch, 
  isLoading = false, 
  initialMode = 'VERIFY_RECORD',
  initialInput = '' 
}: SearchBarProps) {
  const [mode, setMode] = useState<SearchMode>(initialMode);
  const [input, setInput] = useState(initialInput);
  const [secondaryInput, setSecondaryInput] = useState('');
  const [parsed, setParsed] = useState<ParsedSearchInput | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleInputChange = useCallback((value: string) => {
    const parsedInput = parseSearchInput(value);
    setParsed(parsedInput);
    
    // If Aadhaar-like, show masked version
    if (parsedInput.type === 'AADHAAR_LIKE') {
      setInput(parsedInput.sanitized);
      setValidationError(parsedInput.warning || null);
    } else {
      setInput(value);
      setValidationError(null);
    }
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    const parsedInput = parseSearchInput(input);
    const validation = validateInputForMode(parsedInput, mode);
    
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid input');
      return;
    }
    
    setValidationError(null);
    onSearch(mode, input.trim(), secondaryInput.trim() || undefined);
  }, [mode, input, secondaryInput, onSearch]);

  const getModeIcon = (m: SearchMode) => {
    switch (m) {
      case 'VERIFY_RECORD': return <FileSearch className="w-4 h-4" />;
      case 'FIND_HOLDINGS': return <User className="w-4 h-4" />;
      case 'CHECK_UNIT': return <Building className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode Selector */}
      <Tabs value={mode} onValueChange={(v) => {
        setMode(v as SearchMode);
        setValidationError(null);
      }}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="VERIFY_RECORD" className="flex items-center gap-2">
            {getModeIcon('VERIFY_RECORD')}
            <span className="hidden sm:inline">Verify Record</span>
          </TabsTrigger>
          <TabsTrigger value="FIND_HOLDINGS" className="flex items-center gap-2">
            {getModeIcon('FIND_HOLDINGS')}
            <span className="hidden sm:inline">Find Holdings</span>
          </TabsTrigger>
          <TabsTrigger value="CHECK_UNIT" className="flex items-center gap-2">
            {getModeIcon('CHECK_UNIT')}
            <span className="hidden sm:inline">Check Unit</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={getSearchPlaceholder(mode)}
              className="pl-10"
              disabled={isLoading}
            />
          </div>
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Search'
            )}
          </Button>
        </div>

        {/* Secondary input for CHECK_UNIT mode */}
        {mode === 'CHECK_UNIT' && (
          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Verify ownership (optional):
            </span>
            <Input
              value={secondaryInput}
              onChange={(e) => setSecondaryInput(e.target.value)}
              placeholder="Enter owner ID to verify..."
              className="flex-1"
              disabled={isLoading}
            />
          </div>
        )}
      </form>

      {/* Validation Warning */}
      {validationError && (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      {/* Input Type Hint */}
      {parsed && !validationError && input.trim() && (
        <p className="text-xs text-muted-foreground">
          Detected: <span className="font-mono">{parsed.type.replace(/_/g, ' ').toLowerCase()}</span>
        </p>
      )}

      {/* Mode Description */}
      <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
        {mode === 'VERIFY_RECORD' && (
          <>
            <strong>Verify Record:</strong> Check if a property record is legally valid. 
            Enter a parcel ID (prc_*), submission ID (sub_*), transaction hash (0x*), or bundle hash (sha256:*).
          </>
        )}
        {mode === 'FIND_HOLDINGS' && (
          <>
            <strong>Find My Holdings:</strong> Discover all properties you own. 
            Enter your owner ID (e.g., did:user:ram or UID-DEMO-123456).
          </>
        )}
        {mode === 'CHECK_UNIT' && (
          <>
            <strong>Check Unit:</strong> View ownership details of a specific unit. 
            Enter a component ID (cmp_*). Optionally verify if you are the owner.
          </>
        )}
      </div>
    </div>
  );
}
