# Design System Strategy: The Architect’s Journal

## 1. Overview & Creative North Star
**Creative North Star: The Draftsman’s Intent**

This design system is not a static interface; it is a living document—a digital sketchbook that captures the meticulous beauty of a work-in-progress. By blending the precision of architectural drafting with the warmth of hand-applied watercolor, we move away from "software-first" UI and toward a "human-first" editorial experience.

To break the "template" look, we embrace **Intentional Imperfection**. Instead of razor-sharp 1px lines and perfect 90-degree corners, we use slightly irregular strokes and asymmetric layouts. Information flows organically across the page, using white space as a structural element rather than a void. The result is a high-end, bespoke digital environment that feels curated, professional, and deeply authentic.

---

## 2. Colors
Our palette mimics the tactile reality of physical media. In **light mode**, the feel is heavy-weight vellum paper, graphite lead, and pigment washes. In **dark mode**, the feel shifts to a moonlit drafting table--the same sketchbook aesthetic but rendered in luminous ink on dark paper.

Only colors change between modes. Typography, spacing, elevation, and component behavior remain identical.

### Color Tokens

| Token                       | Light Mode | Dark Mode  |
|-----------------------------|------------|------------|
| `background`                | #fbf9f5    | #1a1c1e    |
| `surface`                   | #fbf9f5    | #1e2022    |
| `surface-container-low`     | #f5f1eb    | #252729    |
| `surface-container`         | #efebe5    | #2b2d2f    |
| `surface-container-highest` | #e5e1db    | #3a3c3e    |
| `on-surface`                | #31332f    | #e2e3e0    |
| `primary`                   | #406471    | #0fc3eb    |
| `primary-container`         | #c4dce4    | #004d5e    |
| `primary-dim`               | #335259    | #0a9ec0    |
| `secondary`                 | #7e572e    | #507e8d    |
| `secondary-container`       | #f0dcc8    | #354f59    |
| `tertiary`                  | #b07020    | #fe9d3f    |
| `error`                     | #a83836    | #ffb4ab    |
| `error-container`           | #fce4e3    | #6e1412    |
| `outline`                   | #827d76    | #8c9093    |
| `outline-variant`           | #c9c4bd    | #44474e    |

### Usage Rules

* **Background & Surfaces:** The foundation is `background`. Hierarchy is built by layering `surface-container` tokens from low to highest.
* **The "No-Line" Rule:** Standard 1px solid borders are strictly prohibited for layout sectioning. Separation of concerns must be achieved through background shifts--e.g., a `surface-container-low` panel sitting on a `surface` background.
* **Accents:** `primary`, `secondary`, and `tertiary` should be applied as if via a watercolor brush. Use gradients that transition from `primary` to `primary-container` to simulate pigment pooling on paper. Use `tertiary` sparingly for highlights, badges, or decorative elements that need warmth.
* **Glass & Gradient Rule:** For floating modals or overlays, use semi-transparent `surface-container-highest` with a high `backdrop-blur`. This creates a "tracing paper" effect, allowing the "sketches" underneath to bleed through.
* **Dark Mode Contrast:** In dark mode, accent colors are more vibrant to maintain readability against dark surfaces. The same compositional rules apply--the only difference is the palette itself.

---

## 3. Typography
The typography strategy juxtaposes the clinical precision of architectural planning with the character of handwritten notes.

* **Display & Headlines (Space Grotesk):** This serves as our "Draftsman" style. Use `display-lg` through `headline-sm` for high-impact titles. The wide, technical proportions of Space Grotesk mirror the lettering found on architectural blueprints.
* **Body & Labels (Manrope):** This is our "Clarity" layer. Manrope provides a clean, modern sans-serif contrast that ensures readability across long-form content.
* **Editorial Annotation:** Use `title-sm` or `label-md` in an italicized variant or a secondary color (`secondary`) to act as "hand-written" marginalia—providing extra context as if jotted down in the margins of a sketch.

---

## 4. Elevation & Depth
In this system, depth is a matter of physical stacking (Tonal Layering), not artificial light sources.

* **The Layering Principle:** Avoid traditional drop shadows. Instead, nest content:
* Base: `surface`
* Grouped Content: `surface-container-low`
* Interactive Elements: `surface-container-lowest` (to pop "up")
* **Ambient Shadows:** If a "floating" effect is mandatory (e.g., a primary CTA or FAB), use a large, diffused shadow: `blur: 24px`, `opacity: 6%`, tinted with `on-surface` (#31332f). It should look like a soft graphite smudge, not a digital shadow.
* **The "Ghost Border" Fallback:** If a container requires a boundary for accessibility, use the `outline-variant` token at 15% opacity. This creates a "pencil guideline" that is barely visible but provides structural definition.

---

## 5. Components

### Buttons
* **Primary:** A watercolor wash using a gradient of `primary` to `primary-dim`. The shape should have a custom SVG mask that creates a slightly irregular, hand-drawn perimeter.
* **Secondary:** An outline variant using `outline` at 40% opacity, with a "pencil-drawn" stroke-width that varies slightly (0.5px to 1.5px).
* **Tertiary:** Text-only with a `secondary` (Ochre) underline that looks like a quick marker stroke.

### Input Fields
* **Text Inputs:** No bottom border. Instead, use a `surface-container-highest` subtle fill with a "hand-drawn" `outline-variant` label.
* **Error States:** Use `error` (#a83836) in a "red ink" style—as if a teacher corrected a drawing. Use `error-container` for soft background highlights.

### Cards & Lists
* **The Divider Ban:** Never use horizontal lines to separate list items. Use the `Spacing Scale` (specifically `6` or `8`) to create "Active White Space."
* **Selection Chips:** Use `secondary-container` for the background, making them look like small swatches of ochre tape or highlights on the page.

### Architectural Annotations (Unique Component)
* A custom component consisting of a thin, graphite `primary` line ending in a small circle, connecting a piece of text (marginalia) to a specific UI element. This reinforces the "Sketchbook" aesthetic.

---

## 6. Do’s and Don’ts

### Do
* **Use Asymmetry:** Shift containers slightly off-center (e.g., 2-4px) to avoid a "Bootstrap" grid feel.
* **Embrace Texture:** Use a subtle grain overlay on `surface` backgrounds to mimic the tooth of high-quality paper.
* **Respect White Space:** Treat the empty areas of the screen as "breathing room" for the viewer’s eye, much like an architectural site plan.

### Don’t
* **Don’t use 100% Black or 100% White for text:** In light mode, use `on-surface` (#31332f)--pure black is too harsh for the "graphite" aesthetic. In dark mode, use `on-surface` (#e2e3e0)--pure white (#ffffff) is too stark and breaks the "luminous ink" feel.
* **Don’t use Geometric Perfection:** Avoid `rounded-none` or perfectly circular buttons unless they represent a specific "drafting tool" element. Use `rounded-md` or `rounded-lg` as the default for a softer, organic feel.
* **Don’t Over-Animate:** Transitions should be subtle fades or "ink-bleed" reveals. Avoid bouncy, "techy" spring physics; opt for linear, deliberate movements that feel like a page turning.