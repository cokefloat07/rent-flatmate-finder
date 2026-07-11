import { useForm } from 'react-hook-form';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { loginUser } from '../services/auth.service';
import useAuthStore from '../store/authStore';
import { ROUTES, ROLES } from '../utils/constants';

// ── Simple email regex — good enough for UX; server does the real validation ──
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const loading = useAuthStore((s) => s.loading);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onBlur',
    defaultValues: { email: '', password: '' },
  });

  // Preserve the page the user was trying to reach before being redirected here
  const from = location.state?.from || null;

  const onSubmit = async (values) => {
    try {
      const { user } = await loginUser(values);
      toast.success(`Welcome back, ${user.name}!`);

      // Redirect priority:
      //   1. Whatever page they came from (via ProtectedRoute)
      //   2. Role-appropriate dashboard
      const target =
        from ||
        (user.role === ROLES.OWNER
          ? ROUTES.OWNER_DASHBOARD
          : user.role === ROLES.ADMIN
            ? ROUTES.ADMIN_DASHBOARD
            : ROUTES.TENANT_DASHBOARD);

      navigate(target, { replace: true });
    } catch (err) {
      toast.error(err.userMessage || 'Login failed.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="page-container"
    >
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <LogIn size={26} />
          </div>
          <h1 className="mb-2">Welcome back</h1>
          <p className="text-neutral-700">Sign in to continue where you left off.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5">
          {/* Email */}
          <div className="relative">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              error={errors.email}
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: EMAIL_REGEX,
                  message: 'Enter a valid email address',
                },
              })}
            />
            <Mail
              size={16}
              className="pointer-events-none absolute right-3 top-9 text-neutral-500"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              error={errors.password}
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 8,
                  message: 'Must be at least 8 characters',
                },
              })}
            />
            <Lock
              size={16}
              className="pointer-events-none absolute right-3 top-9 text-neutral-500"
            />
          </div>

          <Button type="submit" variant="primary" fullWidth loading={loading || isSubmitting}>
            Sign in
          </Button>

          <p className="text-center text-sm text-neutral-700">
            Don't have an account?{' '}
            <Link to={ROUTES.REGISTER} className="font-semibold text-primary">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </motion.div>
  );
}
