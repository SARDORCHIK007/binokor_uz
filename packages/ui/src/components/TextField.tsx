import type { InputHTMLAttributes, ReactNode } from "react";
import { cx } from "../cx";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  icon?: ReactNode;
};

export function TextField({ label, hint, error, icon, id, className, ...props }: TextFieldProps) {
  const fieldId = id ?? props.name ?? label;
  const message = error ?? hint;
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={fieldId} className="text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        {icon ? (
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">{icon}</span>
        ) : null}
        <input
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? `${fieldId}-hint` : undefined}
          className={cx(
            "min-h-11 w-full rounded-sm border bg-card text-base text-ink",
            "placeholder:text-muted",
            "focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]",
            "disabled:bg-surface-100 disabled:text-muted",
            "read-only:bg-surface-100",
            icon ? "pr-3 pl-10" : "px-3",
            error ? "border-danger-600" : "border-line",
          )}
          {...props}
        />
      </div>
      {message ? (
        <p id={`${fieldId}-hint`} className={cx("text-sm", error ? "text-danger-600" : "text-muted")}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
