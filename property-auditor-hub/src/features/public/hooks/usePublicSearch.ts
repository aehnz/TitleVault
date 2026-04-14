// ============================================
// USE PUBLIC SEARCH HOOK
// Manages search state and data fetching for public transparency
// ============================================

import { PublicRepo } from '../repos/PublicRepo';

import { HoldingResult, PublicRecordData, PublicSearchState, SearchMode, UnitOwnershipResult } from '@udhbha/types';


export function usePublicSearch() {
  const [state, setState] = useState<PublicSearchState>({
    mode: 'VERIFY_RECORD',
    input: '',
    parsedInput: null,
    isLoading: false,
    error: null,
    recordData: null,
    holdingsResults: null,
    unitResult: null,
  });

  const setMode = useCallback((mode: SearchMode) => {
    setState(prev => ({
      ...prev,
      mode,
      error: null,
    }));
  }, []);

  const search = useCallback(async (input: string, secondaryInput?: string) => {
    const parsed = parseSearchInput(input);
    const validation = validateInputForMode(parsed, state.mode);

    setState(prev => ({
      ...prev,
      input,
      secondaryInput,
      parsedInput: parsed,
      isLoading: true,
      error: validation.valid ? null : validation.error || null,
      recordData: null,
      holdingsResults: null,
      unitResult: null,
    }));

    if (!validation.valid) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      if (state.mode === 'VERIFY_RECORD') {
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
        }

        setState(prev => ({
          ...prev,
          isLoading: false,
          recordData: data,
          error: data ? null : 'No approved record found for this identifier',
        }));
      } else if (state.mode === 'FIND_HOLDINGS') {
        const results = await PublicRepo.findHoldingsByOwner(parsed.sanitized);

        setState(prev => ({
          ...prev,
          isLoading: false,
          holdingsResults: results,
          error: results.length === 0 ? 'No holdings found for this owner ID' : null,
        }));
      } else if (state.mode === 'CHECK_UNIT') {
        const result = await PublicRepo.checkComponentOwnership(
          parsed.sanitized,
          secondaryInput
        );

        if (result) {
          // Also load full record for context
          const recordData = await PublicRepo.resolveByParcelId(result.parcelId);

          setState(prev => ({
            ...prev,
            isLoading: false,
            unitResult: result,
            recordData,
          }));
        } else {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Component not found in any approved submission',
          }));
        }
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'An error occurred while searching',
      }));
    }
  }, [state.mode]);

  const reset = useCallback(() => {
    setState({
      mode: 'VERIFY_RECORD',
      input: '',
      parsedInput: null,
      isLoading: false,
      error: null,
      recordData: null,
      holdingsResults: null,
      unitResult: null,
    });
  }, []);

  return {
    ...state,
    setMode,
    search,
    reset,
  };
}
