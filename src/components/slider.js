import React from "react";

/**
 * SimpleSlider — a lightweight, dependency‑free wrapper around the native
 * `<input type="range">`. It keeps the same API shape (array‑based `value`
 * & `onValueChange`) as the previous Radix version, so you can drop it in
 * without touching parent code.
 *
 * Props
 * ──────────────────────────────────────────────────────────────────────────
 * • value          : number[] (required)  – Controlled value, e.g. `[42]`.
 * • onValueChange  : (number[]) => void   – Callback fired on change.
 * • min, max, step : number              – Range specs (default 0‑100, step 1).
 * • disabled       : boolean             – Disable slider.
 * • className      : string              – Extra Tailwind classes.
 */
export const Slider = React.forwardRef(function Slider(
  {
    value = [0],
    onValueChange,
    min = 0,
    max = 100,
    step = 1,
    disabled = false,
    className = "",
    ...rest
  },
  ref
) {
  const handleChange = (e) => {
    const v = Number(e.target.value);
    if (onValueChange) onValueChange([v]);
  };

  return (
    <div className={`w-full ${className}`} {...rest}>
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value[0] ?? 0}
        onChange={handleChange}
        disabled={disabled}
        className="w-full cursor-pointer accent-primary [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary"
      />
    </div>
  );
});

/******************** Usage (unchanged) ********************
<Slider
  min={1}
  max={100}
  step={1}
  value={[k]}
  onValueChange={([val]) => setK(val)}
/>
***********************************************************/
