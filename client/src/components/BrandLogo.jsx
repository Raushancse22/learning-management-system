import React from "react";

import logoImage from "../assets/gatemate-company-logo.png";
import { classNames } from "../lib/format";

export default function BrandLogo({ dark = false, compact = false, className = "" }) {
  return (
    <div className={classNames("flex items-center gap-3", className)}>
      <img
        src={logoImage}
        alt=""
        aria-hidden="true"
        className={classNames("shrink-0 object-contain", compact ? "h-11 w-11" : "h-14 w-14")}
      />
      <div>
        <p
          className={classNames(
            "font-bold tracking-[-0.04em]",
            compact ? "text-[1.35rem] leading-none" : "text-[1.7rem] leading-none",
            dark ? "text-white" : "text-slate-950",
          )}
        >
          Gatemate Learning
        </p>
        <p className={classNames("mt-1 text-[11px] font-semibold uppercase tracking-[0.28em]", dark ? "text-slate-300" : "text-teal-700")}>
          Smart Learning Platform
        </p>
      </div>
    </div>
  );
}
