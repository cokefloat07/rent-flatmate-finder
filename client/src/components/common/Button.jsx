import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

/**
 * Consistent button used throughout the app.
 *
 * Variants map to the classes defined in index.css:
 *   primary   → .btn-primary
 *   secondary → .btn-secondary
 *   ghost     → .btn-ghost
 *   danger    → .btn-danger
 */
export default function Button({
  children,
  variant = 'primary',
  type = 'button',
  loading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  onClick,
  ...rest
}) {
  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
  }[variant];

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileTap={{ scale: 0.98 }}
      className={`${variantClass} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </motion.button>
  );
}
