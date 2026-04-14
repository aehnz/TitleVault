/**
 * Viewer / Editor entity selection types.
 * Replaces `any` in entity selection handlers.
 */

import type { Floor, Component, Building } from './submission';
import type { TopologyEvent } from './submission';
import type { RightsEvent } from './rights';

/** Union of all entities that can be selected in the Viewer/Editor. */
export type SelectableEntity = Floor | Component | Building | TopologyEvent | RightsEvent;

/** Type guards */
export function isFloor(e: SelectableEntity): e is Floor {
  return 'floor_id' in e;
}
export function isComponent(e: SelectableEntity): e is Component {
  return 'component_id' in e;
}
export function isBuilding(e: SelectableEntity): e is Building {
  return 'building_id' in e;
}
export function isTopologyEvent(e: SelectableEntity): e is TopologyEvent {
  return 'event_id' in e && 'kind' in e && !('target' in e);
}
