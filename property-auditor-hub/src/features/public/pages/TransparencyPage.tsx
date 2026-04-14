// ============================================
// TRANSPARENCY PAGE
// Main public verification interface
// ============================================

import { PublicRepo } from '../repos/PublicRepo';

import { parseSearchInput } from '../utils/searchResolver';
import Viewer3D, { OwnershipFilter } from '../../auditor/components/Viewer3D';
import { HoldingResult, PublicRecordData, SearchMode, TimelineItem } from '@udhbha/types';


export function TransparencyPage() {
  const { parcelId, txHash } = useParams();
  const [searchParams] = useSearchParams();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordData, setRecordData] = useState<PublicRecordData | null>(null);
  const [holdings, setHoldings] = useState<HoldingResult[] | null>(null);
  const [searchedOwnerId, setSearchedOwnerId] = useState<string | null>(null);
  const [selectedTimelineItem, setSelectedTimelineItem] = useState<string | null>(null);
  const [selectedRevision, setSelectedRevision] = useState<number | null>(null);
  const [highlightedComponent, setHighlightedComponent] = useState<string | null>(null);
  const [currentSearchMode, setCurrentSearchMode] = useState<SearchMode>('VERIFY_RECORD');

  // Auto-search from URL params
  useEffect(() => {
    if (parcelId) {
      handleSearch('VERIFY_RECORD', parcelId);
    } else if (txHash) {
      handleSearch('VERIFY_RECORD', txHash);
    }
  }, [parcelId, txHash]);

  const handleSearch = useCallback(async (mode: SearchMode, input: string, secondaryInput?: string) => {
    setIsLoading(true);
    setError(null);
    setRecordData(null);
    setHoldings(null);
    setSearchedOwnerId(null);
    setCurrentSearchMode(mode);  // Track the search mode

    try {
      const parsed = parseSearchInput(input);

      if (mode === 'VERIFY_RECORD') {
        let data: PublicRecordData | null = null;
        
        switch (parsed.type) {
          case 'PARCEL_ID':
            data = await PublicRepo.resolveByParcelId(parsed.sanitized);
            break;
          case 'SUBMISSION_ID':
            data = await PublicRepo.resolveBySubmissionId(parsed.sanitized);
            break;
          case 'TX_HASH':
            data = await PublicRepo.resolveByTxHash(parsed.sanitized);
            break;
          case 'BUNDLE_HASH':
            data = await PublicRepo.resolveByBundleHash(parsed.sanitized);
            break;
          default:
            setError('Invalid input format for record verification');
            return;
        }
        
        if (!data) {
          setError('No approved record found for this identifier');
          return;
        }
        
        setRecordData(data);
      } else if (mode === 'FIND_HOLDINGS') {
        const results = await PublicRepo.findHoldingsByOwner(parsed.sanitized);
        setHoldings(results);
        setSearchedOwnerId(parsed.sanitized);
        
        if (results.length === 0) {
          setError('No holdings found for this owner ID');
        }
      } else if (mode === 'CHECK_UNIT') {
        const result = await PublicRepo.checkComponentOwnership(parsed.sanitized, secondaryInput);
        
        if (!result) {
          setError('Component not found in any approved submission');
          return;
        }
        
        // Load the full record for this component's parcel
        const data = await PublicRepo.resolveByParcelId(result.parcelId);
        if (data) {
          setRecordData(data);
          setHighlightedComponent(parsed.sanitized);
          if (secondaryInput) {
            setSearchedOwnerId(secondaryInput);
          }
        }
      }
    } catch (err) {
      setError('An error occurred while searching');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleTimelineSelect = useCallback((item: TimelineItem) => {
    setSelectedTimelineItem(item.id);
    // When clicking a revision header, update the selected revision for 3D viewer
    if (item.type === 'REVISION_HEADER') {
      setSelectedRevision(item.revisionNumber);
    }
    if (item.entityId) {
      setHighlightedComponent(item.entityId);
    }
  }, []);

  // Use revision snapshots hook to get geometry at each revision
  const { snapshots, getSnapshotAtRevision, latestSnapshot } = useRevisionSnapshots({
    submission: recordData?.submission || { 
      meta: { 
        submission_id: '', 
        status: 'DRAFT' as const, 
        created_by: '', 
        schema_version: '1.0', 
        created_at: '', 
        updated_at: '', 
        parent_submission_id: null, 
        change_kind: 'BASELINE' as const, 
        change_note: '', 
        revision_number: 1, 
        locked: false 
      },
      parcel: { parcel_id: '', name: '', boundary_geom: '', docs: [] },
      buildings: [],
      floors: [],
      components: [],
      geometry_store: {},
      documents_index: {},
      topology_events: [],
      rights_events: [],
    },
    parent: recordData?.parent || null,
  });

  // Get the snapshot for the currently selected revision, or latest by default
  const activeSnapshot = useMemo(() => {
    if (!recordData) return null;
    if (selectedRevision !== null) {
      return getSnapshotAtRevision(selectedRevision);
    }
    return latestSnapshot;
  }, [recordData, selectedRevision, getSnapshotAtRevision, latestSnapshot]);

  // Use snapshot's own geometry store directly (each snapshot is now self-contained)
  const activeGeometryStore = useMemo(() => {
    if (!activeSnapshot) return {};
    return activeSnapshot.geometryStore;
  }, [activeSnapshot]);

  // Compute ownership filter based on search mode
  const ownershipFilter = useMemo((): OwnershipFilter | undefined => {
    if (!recordData || !activeSnapshot) return undefined;
    
    // VERIFY_RECORD mode: show full building (no filter)
    if (currentSearchMode === 'VERIFY_RECORD') {
      return { mode: 'FULL', ownedComponentIds: new Set() };
    }
    
    // Compute active claims for the current snapshot
    const claims = computeOwnership(
      recordData.parent?.rights_events || [],
      recordData.submission.rights_events
    );
    
    // FIND_HOLDINGS mode: highlight all components owned by searchedOwnerId
    if (currentSearchMode === 'FIND_HOLDINGS' && searchedOwnerId) {
      const ownedIds = new Set(
        claims
          .filter(c => c.active && c.holder.toLowerCase() === searchedOwnerId.toLowerCase())
          .map(c => c.target_id)
      );
      return { mode: 'FIND_HOLDINGS', ownedComponentIds: ownedIds };
    }
    
    // CHECK_UNIT mode: focus on single component
    if (currentSearchMode === 'CHECK_UNIT' && highlightedComponent) {
      return { 
        mode: 'CHECK_UNIT', 
        ownedComponentIds: new Set(), 
        focusedComponentId: highlightedComponent 
      };
    }
    
    return { mode: 'FULL', ownedComponentIds: new Set() };
  }, [recordData, activeSnapshot, currentSearchMode, searchedOwnerId, highlightedComponent]);

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Search Bar */}
        <SearchBar 
          onSearch={handleSearch} 
          isLoading={isLoading}
          initialInput={parcelId || txHash || ''}
        />

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="text-center py-16">
            <FileSearch className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{error}</p>
          </div>
        )}

        {/* Holdings Results */}
        {holdings && holdings.length > 0 && !recordData && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Your Holdings ({holdings.length})</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {holdings.map((h, idx) => (
                <div 
                  key={idx}
                  className="p-4 border rounded-lg hover:border-primary cursor-pointer transition-colors"
                  onClick={() => handleSearch('VERIFY_RECORD', h.parcelId)}
                >
                  <div className="font-medium">{h.parcelName}</div>
                  <div className="text-sm text-muted-foreground">{h.componentLabel} • {h.floorLabel}</div>
                  <div className="text-sm text-muted-foreground">{(h.share * 100).toFixed(0)}% share</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Record Data View */}
        {recordData && !isLoading && (
          <>
            {/* Trust Summary */}
            <TrustSummaryCard data={recordData} />

            {/* Main Content Tabs */}
            <Tabs defaultValue="history" className="space-y-4">
              <TabsList>
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="ownership">Ownership</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="proof">Blockchain Proof</TabsTrigger>
              </TabsList>

              <TabsContent value="history" className="space-y-4">
                {/* Ownership Filter Indicator */}
                {ownershipFilter && ownershipFilter.mode !== 'FULL' && (
                  <div 
                    className="flex items-center gap-2 p-3 rounded-lg border"
                    style={{ 
                      backgroundColor: `${getStatusColor('APPROVED')}15`,
                      borderColor: `${getStatusColor('APPROVED')}40`
                    }}
                  >
                    <Eye className="w-4 h-4" style={{ color: getStatusColor('APPROVED') }} />
                    <span className="text-sm font-medium" style={{ color: getStatusColor('APPROVED') }}>
                      {ownershipFilter.mode === 'FIND_HOLDINGS' 
                        ? `Showing ${ownershipFilter.ownedComponentIds.size} unit(s) owned by ${searchedOwnerId}`
                        : `Focused on unit: ${highlightedComponent}`
                      }
                    </span>
                    <Badge 
                      className="ml-auto text-white"
                      style={{ backgroundColor: getStatusColor('APPROVED') }}
                    >
                      {ownershipFilter.mode === 'FIND_HOLDINGS' ? 'My Holdings' : 'Unit Check'}
                    </Badge>
                  </div>
                )}

                <div className="grid lg:grid-cols-3 gap-4">
                  {/* 3D Viewer - shows snapshot at selected revision */}
                  <div className="lg:col-span-2 flex flex-col gap-2">
                    {/* Revision indicator */}
                    {activeSnapshot && (
                      <div className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-t-lg border-b">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Physical History
                        </span>
                        <Badge variant="outline" className="text-xs font-mono bg-background">
                          Viewing: Revision {activeSnapshot.revisionNumber}
                          {activeSnapshot.revisionNumber === (recordData?.parent?.meta.revision_number || 0) ? ' (Baseline)' : ''}
                        </Badge>
                      </div>
                    )}
                    <div className="h-[480px] border rounded-lg overflow-hidden">
                      {activeSnapshot && (
                        <Viewer3D
                          parcel={activeSnapshot.parcel}
                          buildings={activeSnapshot.buildings}
                          floors={activeSnapshot.floors}
                          components={activeSnapshot.components}
                          geometryStore={activeGeometryStore}
                          claims={activeSnapshot.claims}
                          selectedComponent={highlightedComponent}
                          onSelectComponent={setHighlightedComponent}
                          ownershipFilter={ownershipFilter}
                        />
                      )}
                    </div>
                  </div>
                  {/* Timeline */}
                  <div className="lg:col-span-1">
                    <HistoryTimeline
                      submission={recordData.submission}
                      parent={recordData.parent}
                      auditReport={recordData.auditReport}
                      registrarRecord={recordData.registrarRecord}
                      selectedItemId={selectedTimelineItem}
                      onSelectItem={handleTimelineSelect}
                      filterOwnerId={currentSearchMode === 'FIND_HOLDINGS' ? searchedOwnerId : null}
                      ownedComponentIds={ownershipFilter?.ownedComponentIds}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="ownership">
                <OwnershipSnapshotPanel
                  submission={recordData.submission}
                  parent={recordData.parent}
                  highlightOwnerId={searchedOwnerId || undefined}
                  onHighlightComponent={setHighlightedComponent}
                />
              </TabsContent>

              <TabsContent value="documents">
                <PublicDocumentsTable
                  submission={recordData.submission}
                  parent={recordData.parent}
                  auditReport={recordData.auditReport}
                />
              </TabsContent>

              <TabsContent value="proof">
                <ChainProofSection data={recordData} />
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Empty State */}
        {!isLoading && !error && !recordData && !holdings && (
          <div className="text-center py-16">
            <FileSearch className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium mb-2">Verify Property Records</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Enter a parcel ID, transaction hash, or owner ID above to verify property records 
              and check ownership status.
            </p>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
