# Smooth Canvas Navigation Design

## Goal

Provide CAD-style canvas navigation: continuous cursor-anchored zoom and free two-dimensional panning with the middle mouse button. Navigation must feel responsive while preserving existing PVC editing behavior.

## Interaction

- Scrolling the wheel over the SVG canvas zooms without requiring Ctrl.
- Ctrl + wheel remains supported for compatibility.
- Zoom is centered on the canvas coordinate currently under the pointer. That coordinate must remain under the pointer after the viewBox changes.
- Zoom uses a short ease-out transition without momentum, overshoot, or fixed scale levels.
- Holding the middle mouse button pans freely in any direction. It takes priority over piece dragging even when pressed on a track piece, label, or connection point.
- Ctrl + left-button panning remains supported for compatibility.
- Panning continues when the pointer leaves the SVG and stops immediately when the initiating button is released.
- Minimap navigation, selection, dragging, snapping, measurement, and auto-fill remain unchanged.
- Existing minimum and maximum zoom limits remain in force.

## Implementation

Use the wheel event's real `deltaY` rather than reducing it to a direction. Normalize `deltaMode`, accumulate wheel movement for the current animation frame, and calculate a target viewBox with a slightly lower sensitivity than the current continuous zoom.

Animate the rendered viewBox toward the target over approximately 80-120 ms with a time-based ease-out. New wheel input updates the target immediately. Stop the animation at a small epsilon so there is no continuing inertia after input ends.

Use the existing SVG screen-to-user coordinate conversion to obtain the pointer anchor. Compute the anchor's relative position inside the current viewBox, then derive the new viewBox origin so the same SVG coordinate stays under the pointer. Clamp dimensions and position to the current canvas bounds.

For panning, store the active button, previous client coordinate, pending coordinate, and animation-frame ID in refs. Listen for native window mousemove and mouseup events while panning so movement continues outside the canvas. Convert consecutive client positions through the SVG matrix and apply their exact SVG delta once per frame. React state is used only for the visible panning cursor, not for each mousemove.

Piece mouse handlers must ignore non-left buttons before stopping propagation, allowing a middle-button press to reach the canvas panning handler. Keep the logic within the PVC UI layer and do not change track geometry.

## Verification

- A small wheel delta produces a smaller viewBox change than a large delta.
- Multiple rapid wheel events accumulate smoothly without fixed 15% jumps.
- The SVG coordinate beneath the pointer remains stable before and after zoom.
- Normal wheel and Ctrl + wheel both work.
- Zoom approaches its target over multiple frames and settles promptly.
- Middle-button dragging pans horizontally, vertically, and diagonally.
- Starting middle-button panning over a piece or label does not select or move that piece.
- Panning continues outside the SVG and stops on middle-button release.
- Ctrl + left-button panning remains functional.
- Zoom limits and canvas bounds still apply.
- Existing drag, box-selection, minimap, measurement, auto-fill, import/export, and 200-piece interaction tests continue to pass.
