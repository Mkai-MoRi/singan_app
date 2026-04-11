# Design System: Cyber-Noir Technical Documentation

## 1. Overview & Creative North Star

### Creative North Star: The Diagnostic Artifact
This design system is not a standard interface; it is a "Diagnostic Artifact." It treats the screen as a high-fidelity terminal or a piece of classified technical documentation from a near-future noir setting. The objective is to move away from friendly, rounded "consumer" aesthetics toward a high-contrast, intentional, and intellectually demanding digital experience.

**Breaking the Template:**
We reject the soft, approachable grid. This system thrives on **Analytical Asymmetry**. Layouts should feel like a series of technical modules plugged into a mainframe. We use extreme typographic scaling—pairing massive, glitch-textured titles with microscopic, monospaced metadata—to create a sense of depth and hierarchy that feels engineered rather than "designed."

---

## 2. Colors

The palette is rooted in deep obsidian tones, punctuated by a singular, high-energy magenta. It is a world of shadows illuminated by technical readouts.

### Color Tokens (Material Design Convention)
*   **Background:** `#131313` (The void; the base for all noise and texture)
*   **Primary:** `#ffb0c9` (Bright magenta for highlights and data accents)
*   **On-Primary:** `#650034` (Deep contrast text on primary surfaces)
*   **Secondary:** `#ddbfc8` (Muted technical pink for secondary readouts)
*   **Surface:** `#131313`
*   **Surface-Container-Low:** `#1c1b1b` (Subtle nesting base)
*   **Surface-Container-High:** `#2a2a2a` (Raised module panels)
*   **Tertiary:** `#5be147` (Auxiliary status: "System Normal")
*   **Error:** `#ffb4ab` (Critical alert state)

### Color Application Rules
*   **The "No-Line" Rule:** Do not use 1px solid gray borders to section content. Boundaries must be defined by the shift between `Surface` and `Surface-Container-Low`. The only exception is the **Signature Pink Hairline**, used for technical containment.
*   **Signature Textures:** The background must never be a flat hex code. Apply a subtle grain/film-noise overlay (2-4% opacity) to provide a tactile, analog feel to the digital terminal.
*   **The "Glass & Gradient" Rule:** Floating data modules should utilize `Surface-Container-Highest` with a `backdrop-filter: blur(10px)`. Main call-to-actions should feature a subtle linear gradient from `primary` to `primary_container` to simulate a glowing cathode-ray tube (CRT) effect.

---

## 3. Typography

The typography scale is designed to mimic a data terminal. We use `Space Grotesk` as our primary monospaced engine, emphasizing technical clarity.

*   **Display (Large/Medium):** `3.5rem` / `2.75rem`. Use these sparingly for primary identifiers. For the signature "glitch" effect seen in titles like "RADIANCE," apply a high-contrast noise mask.
*   **Headline (Sm/Md/Lg):** `1.5rem` to `2.0rem`. Use all-caps for a more authoritative, military-spec feel.
*   **Title (Sm/Md/Lg):** `1.0rem` to `1.375rem`. These act as the headers for specific data modules.
*   **Body (Sm/Md/Lg):** `0.75rem` to `1.0rem`. Space Grotesk at `1rem` is highly legible for long-form technical explanations.
*   **Label (Sm/Md):** `0.6875rem` to `0.75rem`. Used for "Metadata Annotations"—the tiny numbers and labels that sit alongside charts and waveforms.

**Hierarchy Strategy:** Use `Primary` colored text for headers and `On-Surface-Variant` (muted pink-gray) for body text to ensure the most important diagnostic data stands out.

---

## 4. Elevation & Depth

In this system, elevation is not achieved via shadows, but through **Tonal Layering** and **Technical Framing**.

*   **The Layering Principle:** Nested data boxes use the scale: `Surface` -> `Surface-Container-Low` -> `Surface-Container-High`. This creates a recessed, "drilled-in" look for data modules.
*   **Ambient Shadows:** If a module must "float" (e.g., a critical alert dialog), use an extremely diffused shadow: `box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4)`. The shadow color should be tinted with `#131313` rather than neutral black.
*   **The "Ghost Border":** For module definition, use the `outline_variant` token at 15% opacity. This creates a suggestion of a container without breaking the dark aesthetic.
*   **Technical Glass:** Modal backgrounds should use `Surface-Container-Lowest` at 80% opacity with a heavy `backdrop-blur`. This simulates a transparent HUD (Heads-Up Display) overlaying the data beneath.

---

## 5. Components

### Buttons
*   **Primary:** Solid `Primary` background, `On-Primary` text, `0.25rem` radius. Must have a subtle glow effect on hover (box-shadow using `Primary` color at 20%).
*   **Secondary/Outline:** `Ghost Border` (Outline-variant @ 50%) with `Primary` text. No background fill.
*   **Tertiary:** Text-only, All-caps, monospaced metadata style.

### Input Fields
*   **Style:** No background fill. Use a bottom-only border (`Ghost Border`) that turns `Primary` and 1px solid when focused.
*   **Labels:** Always `Label-Sm` and placed above the input field, left-aligned.

### Cards & Data Modules
*   **Restriction:** Absolutely no divider lines between sections. Use vertical spacing (1.5rem - 2rem) or a subtle shift to `Surface-Container-Low` to delineate content.
*   **Annotations:** Every card must have a "Metadata Tag" in the top right or bottom left (e.g., `OBJ_02 // LUNAR_REFLECTOR`).

### Data Visualization (Signature Components)
*   **Waveforms:** Use 1px `Primary` lines for sine waves to represent system pulses.
*   **Wireframes:** Use `Outline-Variant` at 30% for 3D technical wireframes (e.g., spheres or terrain maps).
*   **Radar/Circular Charts:** Use dashed lines (`stroke-dasharray`) to indicate scanning or diagnostic progress.

---

## 6. Do's and Don'ts

### Do
*   **DO** use monospaced fonts for all numerical data.
*   **DO** use "Diagnostic Annotations" (small labels like `v.09` or `COORD_X`) to fill whitespace in technical layouts.
*   **DO** use intentional asymmetry—align a primary chart to the left and its metadata to the extreme right.
*   **DO** apply a subtle grain texture to the entire interface to maintain the "noir" aesthetic.

### Don't
*   **DON'T** use large border-radii. Keep corners sharp (`none`) or use the `sm` (`0.125rem`) setting for a precision-engineered look.
*   **DON'T** use saturated colors other than the primary Magenta and the tertiary Green.
*   **DON'T** use drop shadows for every card; rely on color shifts and hairline outlines instead.
*   **DON'T** use icons with rounded, friendly flourishes. Icons should be thin-line, geometric, and technical.