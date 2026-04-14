// ============================================
// DOC ATTACHMENT INDEX TESTS
// ============================================

import { Submission } from '@udhbha/types';


// Minimal mock submission for testing
const createMockSubmission = (): Submission => ({
  meta: {
    submission_id: 'test_sub_001',
    status: 'SUBMITTED',
    created_by: 'surveyor@test.com',
    schema_version: '1.0.0',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    parent_submission_id: null,
    change_kind: 'BASELINE',
    change_note: 'Test',
    revision_number: 1,
    locked: false,
  },
  parcel: {
    parcel_id: 'prc_001',
    name: 'Test Parcel',
    boundary_geom: 'geom_parcel',
    docs: [{ id: 'doc_parcel_1', name: 'Parcel Survey', type: 'survey' }],
  },
  buildings: [
    {
      building_id: 'bld_001',
      name: 'Test Building',
      footprint_geom: 'geom_building',
      docs: [{ id: 'doc_building_1', name: 'Building Plan', type: 'plan' }],
    },
  ],
  floors: [
    {
      floor_id: 'fl_1',
      building_id: 'bld_001',
      level: 1,
      label: 'Level 1',
      outline_geom: 'geom_floor_1',
      active: { from: '2024-01-01', to: null },
      docs: [{ id: 'doc_floor_1', name: 'Floor Plan', type: 'plan' }],
    },
  ],
  components: [
    {
      component_id: 'cmp_001',
      floor_id: 'fl_1',
      label: 'Unit A',
      type: 'residential',
      geom_ref: 'geom_cmp_1',
      active: { from: '2024-01-01', to: null },
      docs: [{ id: 'doc_cmp_1', name: 'Unit Deed', type: 'sale_deed' }],
    },
  ],
  rights_events: [
    {
      event_id: 'evt_rights_1',
      kind: 'ADD_OWNERSHIP',
      ts: '2024-01-01T00:00:00Z',
      target: { level: 'UNIT', id: 'cmp_001' },
      payload: { holder: 'owner@test.com', share: 1 },
      docs: [{ id: 'doc_deed_1', name: 'Ownership Deed', type: 'sale_deed' }],
    },
  ],
  topology_events: [
    {
      event_id: 'evt_topo_1',
      kind: 'ADD_FLOOR',
      ts: '2024-01-01T00:00:00Z',
      target: { entity: 'BUILDING', id: 'bld_001' },
      payload: { floor_id: 'fl_1' },
      docs: [
        { id: 'doc_floor_1', name: 'Floor Plan', type: 'plan' }, // Same doc attached to floor
      ],
    },
  ],
  geometry_store: {},
  documents_index: {},
});

describe('buildDocAttachmentIndex', () => {
  it('indexes documents from all entity types', () => {
    const submission = createMockSubmission();
    const index = buildDocAttachmentIndex(submission);

    // Check parcel doc
    expect(index['doc_parcel_1']).toBeDefined();
    expect(index['doc_parcel_1'].length).toBe(1);
    expect(index['doc_parcel_1'][0].kind).toBe('PARCEL');

    // Check building doc
    expect(index['doc_building_1']).toBeDefined();
    expect(index['doc_building_1'].length).toBe(1);
    expect(index['doc_building_1'][0].kind).toBe('BUILDING');

    // Check component doc
    expect(index['doc_cmp_1']).toBeDefined();
    expect(index['doc_cmp_1'].length).toBe(1);
    expect(index['doc_cmp_1'][0].kind).toBe('COMPONENT');

    // Check rights event doc
    expect(index['doc_deed_1']).toBeDefined();
    expect(index['doc_deed_1'].length).toBe(1);
    expect(index['doc_deed_1'][0].kind).toBe('RIGHTS_EVENT');

    // Check floor doc is indexed from both floor and topology event
    expect(index['doc_floor_1']).toBeDefined();
    expect(index['doc_floor_1'].length).toBe(2); // Attached to both floor and topology event
  });

  it('avoids duplicate attachments for same entity', () => {
    const submission = createMockSubmission();
    // Add the same doc to the same entity twice
    submission.parcel.docs.push({ id: 'doc_parcel_1', name: 'Parcel Survey', type: 'survey' });
    
    const index = buildDocAttachmentIndex(submission);
    
    // Should still only have 1 PARCEL attachment
    const parcelAttachments = index['doc_parcel_1'].filter(a => a.kind === 'PARCEL');
    expect(parcelAttachments.length).toBe(1);
  });
});

describe('getAttachmentShortLabel', () => {
  it('returns correct labels for each kind', () => {
    expect(getAttachmentShortLabel({ kind: 'PARCEL', parcel_id: 'p1', label: 'P' })).toBe('Parcel');
    expect(getAttachmentShortLabel({ kind: 'BUILDING', building_id: 'b1', label: 'B' })).toBe('Building');
    expect(getAttachmentShortLabel({ kind: 'FLOOR', floor_id: 'f1', level: 2, label: 'L2' })).toBe('Floor: Level 2');
    expect(getAttachmentShortLabel({ kind: 'COMPONENT', component_id: 'c1', floor_id: 'f1', label: 'Unit A' })).toBe('Unit: Unit A');
    expect(getAttachmentShortLabel({ kind: 'RIGHTS_EVENT', event_id: 'e1', event_kind: 'TRANSFER_OWNERSHIP', target_level: 'UNIT', target_id: 'c1', label: '' })).toBe('Rights: TRANSFER_OWNERSHIP');
    expect(getAttachmentShortLabel({ kind: 'TOPOLOGY_EVENT', event_id: 'e2', event_kind: 'ADD_FLOOR', label: '' })).toBe('Topology: ADD_FLOOR');
  });
});

describe('getAttachmentTooltip', () => {
  it('returns correct tooltips', () => {
    expect(getAttachmentTooltip({ kind: 'PARCEL', parcel_id: 'prc_001', label: 'Test' })).toBe('Attached to Parcel prc_001');
    expect(getAttachmentTooltip({ kind: 'FLOOR', floor_id: 'fl_1', label: 'L1' })).toBe('Attached to Floor fl_1');
  });
});
