"use client";

import { useT } from "@/features/i18n/provider";

/**
 * Shree Ram Krishi Seva Kendra mark, drawn as SVG rather than shipped as a PNG.
 *
 * Vector means it is sharp on the login screen at 320px and on a printed
 * invoice header at 40px from the same source, it weighs nothing, and it needs
 * no asset pipeline. If the original artwork is ever needed verbatim, drop the
 * file at public/logo.png and swap <ShreeRamLogo /> for an <Image />.
 */

interface LogoProps {
  className?: string;
  /** "lockup" is mark + wordmark; "mark" is the roundel alone. */
  variant?: "lockup" | "mark";
}

const GREEN_DARK = "#1F6B38";
const GREEN_MID = "#4FA544";
const GREEN_LIGHT = "#7DC242";
const SUN = "#F2B21C";
const BROWN = "#6E4B2A";

/**
 * The roundel, drawn in a 200x200 box.
 *
 * Draw order matters: ring, sun, wheat, then sprout. The wheat has to go down
 * before the leaves or the stalks cross over the foliage and the middle of the
 * mark turns into a brown smudge at small sizes.
 */
function Mark() {
  return (
    <g>
      {/* ring, with a second inner sweep for the hand-drawn double edge */}
      <circle cx="100" cy="100" r="91" fill="none" stroke={GREEN_DARK} strokeWidth="8" />
      <path
        d="M22 132 A82 82 0 0 1 58 26"
        fill="none"
        stroke={GREEN_DARK}
        strokeWidth="4.5"
        strokeLinecap="round"
      />

      {/* sun: a half-fan of rays over a solid disc */}
      <g stroke={SUN} strokeWidth="4.5" strokeLinecap="round">
        {Array.from({ length: 11 }).map((_, index) => {
          const angle = Math.PI + (index * Math.PI) / 10;
          // Rounded so the string is identical on the server and in the browser:
          // Node and V8 disagree on the last digit of cos/sin, and that one-ULP
          // gap is enough for React to report a hydration mismatch on this SVG.
          const round = (value: number) => Math.round(value * 1000) / 1000;
          return (
            <line
              key={index}
              x1={round(100 + Math.cos(angle) * 26)}
              y1={round(56 + Math.sin(angle) * 26)}
              x2={round(100 + Math.cos(angle) * 39)}
              y2={round(56 + Math.sin(angle) * 39)}
            />
          );
        })}
      </g>
      <circle cx="100" cy="56" r="18" fill={SUN} />

      {/* wheat: two stalks sweeping out and up from the base */}
      {[-1, 1].map((side) => (
        <g key={side}>
          <path
            d={`M100 182 Q${100 + side * 30} 168 ${100 + side * 54} 116`}
            fill="none"
            stroke={BROWN}
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          {[0.15, 0.4, 0.65, 0.9].map((t) => {
            const gx = 100 + side * (20 + t * 36);
            const gy = 168 - t * 54;
            return (
              <ellipse
                key={t}
                cx={gx}
                cy={gy}
                rx="8"
                ry="4.2"
                fill={BROWN}
                transform={`rotate(${side * -42} ${gx} ${gy})`}
              />
            );
          })}
        </g>
      ))}

      {/* sprout: a central blade with two pairs of leaves beneath it */}
      <path
        d="M100 156 C89 124 89 84 100 50 C111 84 111 124 100 156 Z"
        fill={GREEN_LIGHT}
      />
      <path
        d="M97 116 C74 112 57 96 52 72 C78 74 95 90 97 116 Z"
        fill={GREEN_MID}
      />
      <path
        d="M103 116 C126 112 143 96 148 72 C122 74 105 90 103 116 Z"
        fill={GREEN_MID}
      />
      <path
        d="M97 148 C77 145 62 131 58 111 C81 113 95 127 97 148 Z"
        fill={GREEN_DARK}
      />
      <path
        d="M103 148 C123 145 138 131 142 111 C119 113 105 127 103 148 Z"
        fill={GREEN_DARK}
      />
    </g>
  );
}

export function ShreeRamLogo({ className, variant = "lockup" }: LogoProps) {
  const t = useT();

  if (variant === "mark") {
    return (
      <svg
        viewBox="0 0 200 200"
        className={className}
        role="img"
        aria-label="Shree Ram Krishi Seva Kendra"
      >
        <Mark />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 900 260"
      className={className}
      role="img"
      aria-label="Shree Ram Krishi Seva Kendra - Seeds, Fertilizers, Pesticides, Insecticides"
    >
      {/* The roundel reads as small next to two lines of display type unless it
          is scaled up to roughly their combined height. */}
      <g transform="translate(6 8) scale(1.22)">
        <Mark />
      </g>

      <text
        x="290"
        y="102"
        fill={GREEN_DARK}
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="72"
        fontWeight="700"
      >
        Shree Ram
      </text>
      <text
        x="290"
        y="172"
        fill={BROWN}
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="56"
        fontWeight="600"
      >
        Krishi Seva Kendra
      </text>
      <text
        x="292"
        y="214"
        fill={BROWN}
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="25"
        letterSpacing="0.4"
      >
        {t("brand.strapline")}
      </text>
    </svg>
  );
}
