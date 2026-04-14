import { AuditReport, RegistrarRecord, Submission, TransparencyBundle } from '@udhbha/types';

// ============================================
// DEMO SEED DATA
// Approved baseline + submitted revision
// ============================================

export const DEMO_PARENT_SUBMISSION: Submission = {
  meta: {
    submission_id: "sub_demo_001",
    status: "APPROVED",
    created_by: "surveyor@demo.gov",
    schema_version: "v1",
    created_at: "2026-01-24T11:11:39.282Z",
    updated_at: "2026-01-24T11:12:52.587Z",
    parent_submission_id: null,
    change_kind: "BASELINE",
    change_note: "Initial approved record",
    revision_number: 1,
    locked: true
  },
  parcel: {
    parcel_id: "prc_demo_001",
    name: "Utara Parcel Demo",
    ref_frame: { type: "local_planar", units: "m" },
    anchors: [
      { id: "A1", wgs84: [23.0225, 72.5712], local_xy: [0, 0] },
      { id: "A2", wgs84: [23.02265, 72.57195], local_xy: [90, 8] },
      { id: "A3", wgs84: [23.02185, 72.57145], local_xy: [12, 105] }
    ],
    boundary_geom: "geom_parcel_v1",
    docs: [{ id: "doc_parcel_survey", name: "Parcel Survey Report", type: "survey" }]
  },
  buildings: [
    {
      building_id: "bld_demo_001",
      parcel_id: "prc_demo_001",
      name: "Utara Mall",
      footprint_geom: "geom_bld_fp_v1",
      docs: [{ id: "doc_building_plan", name: "Approved Building Plan", type: "plan" }]
    }
  ],
  floors: [
    {
      floor_id: "fl_0",
      building_id: "bld_demo_001",
      level: 0,
      label: "Ground",
      outline_geom: "geom_fl_0_v1",
      active: { from: "2026-01-01", to: null },
      docs: [{ id: "doc_gf_plan", name: "Ground Floor Plan", type: "plan" }]
    },
    {
      floor_id: "fl_1",
      building_id: "bld_demo_001",
      level: 1,
      label: "First",
      outline_geom: "geom_fl_1_v1",
      active: { from: "2026-01-01", to: null },
      docs: [{ id: "doc_f1_plan", name: "First Floor Plan", type: "plan" }]
    }
  ],
  components: [
    {
      component_id: "cmp_gf_101",
      floor_id: "fl_0",
      label: "Shop G-101",
      type: "shop",
      geom_ref: "geom_cmp_gf_101_v1",
      active: { from: "2026-01-01", to: null },
      docs: [{ id: "doc_sale_g101", name: "Sale Deed G-101", type: "sale_deed" }]
    }
  ],
  rights_events: [
    {
      event_id: "evt_demo_001",
      kind: "ADD_OWNERSHIP",
      ts: "2026-01-10T10:00:00Z",
      target: { level: "UNIT", id: "cmp_gf_101" },
      payload: { holder: "did:user:ali", share: 1 },
      docs: [{ id: "doc_sale_g101", name: "Sale Deed G-101", type: "sale_deed" }],
      note: "Initial ownership registration",
      created_at: "2026-01-10T10:00:00Z",
      created_by: "surveyor@demo.gov",
      origin: "APPROVED_BASELINE"
    }
  ],
  topology_events: [],
  geometry_store: {
    geom_parcel_v1: { polygon: [[0, 0], [95, 10], [90, 110], [10, 100], [0, 0]] },
    geom_bld_fp_v1: { polygon: [[10, 10], [85, 15], [80, 95], [15, 90], [10, 10]] },
    geom_fl_0_v1: { polygon: [[12, 12], [83, 18], [78, 88], [18, 85], [12, 12]] },
    geom_fl_1_v1: { polygon: [[14, 14], [82, 20], [76, 86], [20, 84], [14, 14]] },
    geom_cmp_gf_101_v1: { polygon: [[18, 20], [38, 22], [36, 40], [20, 38], [18, 20]] }
  },
  documents_index: {
    doc_parcel_survey: {
      id: "doc_parcel_survey",
      name: "Parcel Survey Report",
      type: "survey",
      storage: { provider: "LOCALHOST", ref: "" }
    },
    doc_building_plan: {
      id: "doc_building_plan",
      name: "Approved Building Plan",
      type: "plan",
      storage: { provider: "LOCALHOST", ref: "" }
    },
    doc_gf_plan: {
      id: "doc_gf_plan",
      name: "Ground Floor Plan",
      type: "plan",
      storage: { provider: "LOCALHOST", ref: "" }
    },
    doc_f1_plan: {
      id: "doc_f1_plan",
      name: "First Floor Plan",
      type: "plan",
      storage: { provider: "LOCALHOST", ref: "" }
    },
    doc_sale_g101: {
      id: "doc_sale_g101",
      name: "Sale Deed G-101",
      type: "sale_deed",
      storage: { provider: "LOCALHOST", ref: "" }
    }
  }
};

export const DEMO_REVISION_SUBMISSION: Submission = {
  meta: {
    submission_id: "sub_rev_demo_002",
    status: "SUBMITTED",
    created_by: "surveyor@demo.gov",
    schema_version: "v1",
    created_at: "2026-01-24T12:10:00.000Z",
    updated_at: "2026-01-24T12:10:00.000Z",
    parent_submission_id: "sub_demo_001",
    change_kind: "AUTO",
    change_note: "",
    revision_number: 2,
    locked: false
  },
  parcel: {
    parcel_id: "prc_demo_001",
    boundary_geom: "geom_parcel_v1",
    docs: []
  },
  buildings: [
    {
      building_id: "bld_demo_001",
      footprint_geom: "geom_bld_fp_v1",
      docs: []
    }
  ],
  floors: [
    {
      floor_id: "fl_0",
      building_id: "bld_demo_001",
      level: 0,
      label: "Ground",
      outline_geom: "geom_fl_0_v1",
      active: { from: "2026-01-01", to: null },
      docs: []
    },
    {
      floor_id: "fl_1",
      building_id: "bld_demo_001",
      level: 1,
      label: "First",
      outline_geom: "geom_fl_1_v1",
      active: { from: "2026-01-01", to: null },
      docs: []
    },
    {
      floor_id: "fl_2",
      building_id: "bld_demo_001",
      level: 2,
      label: "Level 2",
      outline_geom: "geom_fl_2_v1",
      active: { from: "2026-01-24", to: null },
      docs: [{ id: "doc_l2_plan", name: "Level 2 Plan", type: "plan" }]
    }
  ],
  components: [
    {
      component_id: "cmp_gf_101",
      floor_id: "fl_0",
      label: "Shop G-101",
      type: "shop",
      geom_ref: "geom_cmp_gf_101_v1",
      active: { from: "2026-01-01", to: null },
      docs: []
    },
    {
      component_id: "cmp_l2_201",
      floor_id: "fl_2",
      label: "L2-201",
      type: "residential",
      geom_ref: "geom_cmp_l2_201_v1",
      active: { from: "2026-01-24", to: null },
      docs: [{ id: "doc_sale_l2_201", name: "Sale Deed L2-201", type: "sale_deed" }]
    }
  ],
  topology_events: [
    {
      event_id: "evt_add_floor_fl2",
      kind: "ADD_FLOOR",
      ts: "2026-01-24T12:10:10.000Z",
      base_revision_id: "sub_demo_001",
      target: { entity: "BUILDING", id: "bld_demo_001" },
      payload: {
        building_id: "bld_demo_001",
        floor_id: "fl_2",
        level: 2,
        label: "Level 2",
        outline_geom: "geom_fl_2_v1"
      },
      docs: [{ id: "doc_l2_plan", name: "Level 2 Plan", type: "plan" }],
      note: "Added Level 2"
    },
    {
      event_id: "evt_add_cmp_l2_201",
      kind: "ADD_COMPONENT",
      ts: "2026-01-24T12:10:20.000Z",
      base_revision_id: "sub_demo_001",
      target: { entity: "FLOOR", id: "fl_2" },
      payload: {
        component_id: "cmp_l2_201",
        floor_id: "fl_2",
        type: "residential",
        geom_ref: "geom_cmp_l2_201_v1"
      },
      docs: [{ id: "doc_sale_l2_201", name: "Sale Deed L2-201", type: "sale_deed" }],
      note: "Added unit on L2"
    }
  ],
  rights_events: [
    {
      event_id: "evt_transfer_g101",
      kind: "TRANSFER_OWNERSHIP",
      ts: "2026-01-24T12:10:30.000Z",
      target: { level: "UNIT", id: "cmp_gf_101" },
      payload: {
        holder: "did:user:ram",
        share: 1,
        previous_holder: "did:user:ali"
      },
      docs: [{ id: "doc_sale_transfer_g101", name: "Transfer Deed G-101", type: "sale_deed" }],
      origin: "DRAFT",
      draft_state: "ACTIVE"
    },
    {
      event_id: "evt_add_own_l2_201",
      kind: "ADD_OWNERSHIP",
      ts: "2026-01-24T12:10:40.000Z",
      target: { level: "UNIT", id: "cmp_l2_201" },
      payload: { holder: "did:user:manubhai", share: 1 },
      docs: [{ id: "doc_sale_l2_201", name: "Sale Deed L2-201", type: "sale_deed" }],
      origin: "DRAFT",
      draft_state: "ACTIVE"
    }
  ],
  geometry_store: {
    geom_fl_2_v1: { polygon: [[16, 16], [80, 22], [74, 84], [22, 82], [16, 16]] },
    geom_cmp_l2_201_v1: { polygon: [[20, 25], [45, 27], [43, 55], [22, 53], [20, 25]] }
  },
  documents_index: {
    doc_l2_plan: {
      id: "doc_l2_plan",
      name: "Level 2 Plan",
      type: "plan",
      storage: { provider: "LOCALHOST", ref: "" }
    },
    doc_sale_l2_201: {
      id: "doc_sale_l2_201",
      name: "Sale Deed L2-201",
      type: "sale_deed",
      storage: { provider: "LOCALHOST", ref: "" }
    },
    doc_sale_transfer_g101: {
      id: "doc_sale_transfer_g101",
      name: "Transfer Deed G-101",
      type: "sale_deed",
      storage: { provider: "LOCALHOST", ref: "" }
    }
  }
};

export const DEMO_SUBMISSIONS: Submission[] = [
  DEMO_PARENT_SUBMISSION,
  DEMO_REVISION_SUBMISSION
];

// ============================================
// DEMO PARENT AUDIT/REGISTRAR RECORDS
// Pre-seeded for complete history timeline
// ============================================

export const DEMO_PARENT_AUDIT_REPORT: AuditReport = {
  audit_id: 'audit_demo_001',
  submission_id: 'sub_demo_001',
  parent_submission_id: null,
  auditor_id: 'auditor@demo.gov',
  audited_at: '2026-01-15T10:00:00.000Z',
  decision: 'PASS',
  change_kind_detected: 'BASELINE',
  summary: {
    topology_events: 0,
    rights_events: 1,
    docs_total: 5,
    docs_required: 5,
    docs_missing: 0,
    checks_failed: 0,
  },
  checks: {
    geometry: { status: 'PASS', results: [] },
    rights: { status: 'PASS', results: [] },
    documents: { status: 'PASS', doc_results: [] },
  },
  reasons: [],
  notes: {
    public: 'Initial baseline registration approved.',
    internal: 'All documents verified.',
  },
  integrity: {
    audit_hash_preview: 'demo_audit_hash_001',
    inputs_hash_preview: 'demo_inputs_hash_001',
  },
  fix_hints: { entities: [] },
};

export const DEMO_PARENT_REGISTRAR_RECORD: RegistrarRecord = {
  record_id: 'reg_demo_001',
  submission_id: 'sub_demo_001',
  parent_submission_id: null,
  registrar_id: 'registrar@demo.gov',
  decided_at: '2026-01-20T14:00:00.000Z',
  decision: 'APPROVED_FINAL',
  reasons: [],
  notes: {
    public: 'Property baseline officially registered.',
    internal: 'Standard baseline approval.',
  },
  chain_anchor: {
    network: 'DEMO',
    tx_hash: '0xDEMO_baseline_anchor_001',
    anchored_at: '2026-01-20T14:05:00.000Z',
    bundle_hash: 'demo_bundle_hash_001',
    submission_hash: 'demo_submission_hash_001',
    audit_hash: 'demo_audit_hash_001',
    parent_hash: '',
  },
};

export const DEMO_PARENT_TRANSPARENCY_BUNDLE: TransparencyBundle = {
  transparency_bundle: {
    public_id: 'pub_prc_demo_001_1',
    parcel_id: 'prc_demo_001',
    submission_id: 'sub_demo_001',
    revision_number: 1,
    change_summary: {
      topology: ['Initial building registration', 'Ground and First floors established'],
      rights: ['Initial ownership: Shop G-101 -> did:user:a**'],
    },
    audit: {
      decision: 'PASS',
      public_notes: 'Initial baseline registration approved.',
      public_reasons: [],
    },
    registrar: {
      decision: 'APPROVED_FINAL',
      public_notes: 'Property baseline officially registered.',
    },
    proof: {
      bundle_hash: 'demo_bundle_hash_001',
      submission_hash: 'demo_submission_hash_001',
      audit_hash: 'demo_audit_hash_001',
      parent_hash: '',
      tx_hash: '0xDEMO_baseline_anchor_001',
    },
    redactions: {
      mask_holders: true,
      mask_doc_storage_refs: true,
    },
  },
};
