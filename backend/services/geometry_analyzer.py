"""
Phase 6.4: Geometry Analysis Service
Pure-Python spatial analysis — no external dependencies (shapely-free).
Uses Shoelace formula for area and line-segment intersection for overlap detection.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Optional
import math


@dataclass
class CoverageResult:
    floor_area: float
    covered_area: float
    coverage_ratio: float
    has_gap: bool
    has_overlap: bool


@dataclass
class ValidationIssue:
    type: str
    message: str
    details: dict


class GeometryAnalyzer:
    """Pure-Python geometry analysis — no shapely dependency."""

    @staticmethod
    def compute_area(polygon_coords: list[list[float]]) -> float:
        """Compute area using the Shoelace formula.
        Coords should be [[x1,y1], [x2,y2], ...] (auto-closes if needed).
        """
        if len(polygon_coords) < 3:
            return 0.0

        coords = list(polygon_coords)
        # Auto-close if not closed
        if coords[0] != coords[-1]:
            coords.append(coords[0])

        n = len(coords)
        area = 0.0
        for i in range(n - 1):
            area += coords[i][0] * coords[i + 1][1]
            area -= coords[i + 1][0] * coords[i][1]
        return abs(area) / 2.0

    @staticmethod
    def compute_perimeter(polygon_coords: list[list[float]]) -> float:
        """Compute perimeter length."""
        if len(polygon_coords) < 2:
            return 0.0

        coords = list(polygon_coords)
        if coords[0] != coords[-1]:
            coords.append(coords[0])

        perimeter = 0.0
        for i in range(len(coords) - 1):
            dx = coords[i + 1][0] - coords[i][0]
            dy = coords[i + 1][1] - coords[i][1]
            perimeter += math.sqrt(dx * dx + dy * dy)
        return perimeter

    @staticmethod
    def compute_centroid(polygon_coords: list[list[float]]) -> tuple[float, float]:
        """Compute the centroid of a polygon."""
        if len(polygon_coords) < 3:
            return (0.0, 0.0)

        coords = list(polygon_coords)
        if coords[0] != coords[-1]:
            coords.append(coords[0])

        area = GeometryAnalyzer.compute_area(coords)
        if area == 0:
            # Fallback: average of all points
            xs = [c[0] for c in coords[:-1]]
            ys = [c[1] for c in coords[:-1]]
            return (sum(xs) / len(xs), sum(ys) / len(ys))

        cx, cy = 0.0, 0.0
        n = len(coords)
        for i in range(n - 1):
            cross = coords[i][0] * coords[i + 1][1] - coords[i + 1][0] * coords[i][1]
            cx += (coords[i][0] + coords[i + 1][0]) * cross
            cy += (coords[i][1] + coords[i + 1][1]) * cross

        factor = 1.0 / (6.0 * area)
        return (abs(cx * factor), abs(cy * factor))

    @staticmethod
    def compute_bounding_box(polygon_coords: list[list[float]]) -> dict:
        """Compute axis-aligned bounding box."""
        if not polygon_coords:
            return {'min_x': 0, 'min_y': 0, 'max_x': 0, 'max_y': 0}

        xs = [c[0] for c in polygon_coords]
        ys = [c[1] for c in polygon_coords]
        return {
            'min_x': min(xs), 'min_y': min(ys),
            'max_x': max(xs), 'max_y': max(ys),
        }

    @staticmethod
    def check_component_coverage(
        floor_geom: list[list[float]],
        component_geoms: list[list[list[float]]]
    ) -> CoverageResult:
        """Check that components reasonably cover the floor area.
        Uses area comparison (not exact spatial overlap).
        """
        floor_area = GeometryAnalyzer.compute_area(floor_geom)
        total_component_area = sum(
            GeometryAnalyzer.compute_area(cg) for cg in component_geoms
        )

        coverage_ratio = total_component_area / floor_area if floor_area > 0 else 0

        return CoverageResult(
            floor_area=floor_area,
            covered_area=total_component_area,
            coverage_ratio=coverage_ratio,
            has_gap=coverage_ratio < 0.85,
            has_overlap=total_component_area > floor_area * 1.05,
        )

    @staticmethod
    def validate_polygon(coords: list[list[float]]) -> list[ValidationIssue]:
        """Check for degenerate polygons, zero area, insufficient vertices."""
        issues = []

        if len(coords) < 3:
            issues.append(ValidationIssue(
                type='INSUFFICIENT_VERTICES',
                message=f"Polygon has {len(coords)} vertices (minimum 3 required)",
                details={'vertex_count': len(coords)},
            ))
            return issues

        area = GeometryAnalyzer.compute_area(coords)
        if area < 0.01:
            issues.append(ValidationIssue(
                type='ZERO_AREA',
                message=f"Polygon area is too small ({area:.4f} sq units)",
                details={'area': area},
            ))

        # Check for duplicate consecutive points
        for i in range(len(coords) - 1):
            if coords[i] == coords[i + 1]:
                issues.append(ValidationIssue(
                    type='DUPLICATE_VERTEX',
                    message=f"Duplicate consecutive vertex at index {i}",
                    details={'index': i, 'coord': coords[i]},
                ))

        # Check for self-intersection (simplified: check if any edges cross)
        edges = []
        closed = list(coords)
        if closed[0] != closed[-1]:
            closed.append(closed[0])
        for i in range(len(closed) - 1):
            edges.append((closed[i], closed[i + 1]))

        for i in range(len(edges)):
            for j in range(i + 2, len(edges)):
                if j == len(edges) - 1 and i == 0:
                    continue  # Skip adjacent edges
                if _segments_intersect(edges[i][0], edges[i][1], edges[j][0], edges[j][1]):
                    issues.append(ValidationIssue(
                        type='SELF_INTERSECTION',
                        message=f"Edges {i} and {j} intersect",
                        details={'edge_a': i, 'edge_b': j},
                    ))

        return issues

    @staticmethod
    def analyze_submission_geometry(payload: dict) -> dict:
        """Run a full geometry analysis on a submission payload."""
        geom_store = payload.get('geometry_store', {})
        results = {
            'parcel': None,
            'floors': [],
            'components': [],
            'validation_issues': [],
        }

        # Analyze parcel boundary
        parcel = payload.get('parcel', {})
        boundary_ref = parcel.get('boundary_geom')
        if boundary_ref and boundary_ref in geom_store:
            coords = geom_store[boundary_ref].get('polygon', [])
            results['parcel'] = {
                'area': GeometryAnalyzer.compute_area(coords),
                'perimeter': GeometryAnalyzer.compute_perimeter(coords),
                'centroid': GeometryAnalyzer.compute_centroid(coords),
                'bbox': GeometryAnalyzer.compute_bounding_box(coords),
            }
            for issue in GeometryAnalyzer.validate_polygon(coords):
                results['validation_issues'].append({
                    'entity': 'parcel',
                    'type': issue.type,
                    'message': issue.message,
                })

        # Analyze floors
        for floor in payload.get('floors', []):
            outline_ref = floor.get('outline_geom')
            if outline_ref and outline_ref in geom_store:
                coords = geom_store[outline_ref].get('polygon', [])
                results['floors'].append({
                    'floor_id': floor.get('floor_id'),
                    'area': GeometryAnalyzer.compute_area(coords),
                })

        return results


def _cross(o, a, b):
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])


def _on_segment(p, q, r):
    return (min(p[0], r[0]) <= q[0] <= max(p[0], r[0]) and
            min(p[1], r[1]) <= q[1] <= max(p[1], r[1]))


def _segments_intersect(p1, q1, p2, q2) -> bool:
    """Check if line segments p1-q1 and p2-q2 intersect."""
    d1 = _cross(p2, q2, p1)
    d2 = _cross(p2, q2, q1)
    d3 = _cross(p1, q1, p2)
    d4 = _cross(p1, q1, q2)

    if ((d1 > 0 and d2 < 0) or (d1 < 0 and d2 > 0)) and \
       ((d3 > 0 and d4 < 0) or (d3 < 0 and d4 > 0)):
        return True

    if d1 == 0 and _on_segment(p2, p1, q2): return True
    if d2 == 0 and _on_segment(p2, q1, q2): return True
    if d3 == 0 and _on_segment(p1, p2, q1): return True
    if d4 == 0 and _on_segment(p1, q2, q1): return True

    return False
