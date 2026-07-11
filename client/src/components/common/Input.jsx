import { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Text input with inline error support.
 *
 * Compatible with React Hook Form's `register(...)` — pass the returned
 * props directly and provide `error` from `formState.errors`.
 */
const Input = forwardRef(function Input(
  { label, error, helperText, id, className = '', type = 'text', ...rest },
  ref
) {
  const inputId = id || rest.name;
  const hasError = !!error;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-neutral-900">
          {label}
        </label>
      )}

      <input
        id={inputId}
        ref={ref}
        type={type}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${inputId}-error` : undefined}
        className={`input-base ${
          hasError ? 'border-danger focus:border-danger focus:ring-danger/20' : ''
        }`}
        {...rest}
      />

      {hasError && (
        <p
          id={`${inputId}-error`}
          className="flex items-center gap-1 text-xs font-medium text-danger"
        >
          <AlertCircle size={12} /> {error.message || error}
        </p>
      )}

      {!hasError && helperText && <p className="text-xs text-neutral-500">{helperText}</p>}
    </div>
  );
});

export default Input;
