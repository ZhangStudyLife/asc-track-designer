# Smooth Canvas Zoom Design

## Goal

Replace the current fixed-step canvas zoom with continuous, cursor-anchored zoom similar to desktop CAD software. Zooming must feel responsive with both mouse wheels and touchpads while preserving existing PVC editing behavior.

## Interaction

- Scrolling the wheel over the SVG canvas zooms without requiring Ctrl.
- Ctrl + wheel remains supported for compatibility.
- Zoom is centered on the canvas coordinate currently under the pointer. That coordinate must remain under the pointer after the viewBox changes.
- Right-button panning, minimap navigation, selection, dragging, snapping, measurement, and auto-fill remain unchanged.
- Existing minimum and maximum zoom limits remain in force.

## Implementation

Use the wheel event's real `deltaY` rather than reducing it to a direction. Normalize `deltaMode`, accumulate wheel movement for the current animation frame, and process it once with `requestAnimationFrame`.

Calculate an exponential zoom factor from the accumulated delta. This provides small changes for fine wheel or touchpad input and proportionally larger changes for faster scrolling without discrete scale levels.

Use the existing SVG screen-to-user coordinate conversion to obtain the pointer anchor. Compute the anchor's relative position inside the current viewBox, then derive the new viewBox origin so the same SVG coordinate stays under the pointer. Clamp dimensions and position to the current canvas bounds.

Keep the logic local to `PvcDesigner`; do not introduce a new state system or change track geometry.

## Verification

- A small wheel delta produces a smaller viewBox change than a large delta.
- Multiple rapid wheel events accumulate smoothly without fixed 15% jumps.
- The SVG coordinate beneath the pointer remains stable before and after zoom.
- Normal wheel and Ctrl + wheel both work.
- Zoom limits and canvas bounds still apply.
- Existing drag, box-selection, minimap, measurement, auto-fill, import/export, and 200-piece interaction tests continue to pass.
