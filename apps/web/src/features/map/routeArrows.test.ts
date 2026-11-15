import { expect, it } from 'vitest';
import LineString from 'ol/geom/LineString';
import { routeArrowStyles } from './routeArrows';
it('centers arrow tips on the route and points in each traversal direction', () => {
  const styles = routeArrowStyles(new LineString([[0, 0], [200, 0], [0, 0]]), 1);
  expect(styles).toHaveLength(8);
  const forward = (styles[0]!.getGeometry() as LineString).getCoordinates();
  const reverse = (styles[4]!.getGeometry() as LineString).getCoordinates();
  expect(forward[1]).toEqual([45, 0]);
  expect(reverse[1]).toEqual([175, 0]);
  expect(forward[0]![0]).toBeLessThan(forward[1]![0]!);
  expect(reverse[0]![0]).toBeGreaterThan(reverse[1]![0]!);
});
it('aligns diagonal chevrons with the route tangent without sprite rotation', () => {
  const styles = routeArrowStyles(new LineString([[0, 0], [200, 200]]), 1);
  const [left, tip, right] = (styles[0]!.getGeometry() as LineString).getCoordinates();
  expect(tip![0]).toBeCloseTo(tip![1]!);
  const baseX = (left![0]! + right![0]!) / 2;
  const baseY = (left![1]! + right![1]!) / 2;
  expect(tip![0]! - baseX).toBeCloseTo(tip![1]! - baseY);
  expect(tip![0]).toBeGreaterThan(baseX);
});
it('spaces arrows in screen pixels and skips zero-length geometry', () => {
  expect(routeArrowStyles(new LineString([[0, 0], [0, 0]]), 1)).toEqual([]);
  expect(routeArrowStyles(new LineString([[0, 0], [200, 0]]), 2)).toHaveLength(2);
  expect(routeArrowStyles(new LineString([[0, 0], [200, 0]]), 0)).toEqual([]);
});
