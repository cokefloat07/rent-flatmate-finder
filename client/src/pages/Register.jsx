import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, User, Mail, Lock, Home, Search } from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { registerUser } from '../services/auth.service';
import useAuthStore from '../store/authStore';
import { ROUTES, ROLES } from '../utils/constants';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const navigate = useNavigate();
  const loading = useAuthStore((s) => s.loading);

  // Role toggle — separate from React Hook Form so the animation drives cleanly
  const [role, setRole] = useState(ROLES.TENANT);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onBlur',
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = async (values) => {
    try {
      const { user } = await registerUser({ ...values, role });
      toast.success(`Welcome to Rent & Find, ${user.name}!`);

      // Redirect to role-appropriate dashboard
      const target = user.role === ROLES.OWNER ? ROUTES.OWNER_DASHBOARD : ROUTES.TENANT_DASHBOARD;

      navigate(target, { replace: true });
    } catch (err) {
      toast.error(err.userMessage || 'Registration failed.');
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
            <UserPlus size={26} />
          </div>
          <h1 className="mb-2">Create your account</h1>
          <p className="text-neutral-700">
            Whether you're renting out a room or looking for one — start here.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5">
          {/* ── Role toggle ────────────────────────────────────────────── */}
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-900">I am a…</label>
            <div
              role="tablist"
              className="relative grid grid-cols-2 rounded-2xl bg-neutral-100 p-1"
            >
              {/* Animated slider background */}
              <motion.div
                layout
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                className="absolute inset-y-1 w-1/2 rounded-xl bg-primary shadow-soft"
                style={{
                  left: role === ROLES.TENANT ? '0.25rem' : 'calc(50% - 0.25rem)',
                }}
              />

              <RoleButton
                selected={role === ROLES.TENANT}
                onClick={() => setRole(ROLES.TENANT)}
                icon={<Search size={16} />}
                label="Tenant"
              />
              <RoleButton
                selected={role === ROLES.OWNER}
                onClick={() => setRole(ROLES.OWNER)}
                icon={<Home size={16} />}
                label="Owner"
              />
            </div>

            <AnimatePresence mode="wait">
              <motion.p
                key={role}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="mt-2 text-xs text-neutral-500"
              >
                {role === ROLES.TENANT
                  ? 'Browse listings and get AI-ranked compatibility scores.'
                  : 'Post rooms and receive interest from matched tenants.'}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* ── Full name ─────────────────────────────────────────────── */}
          <div className="relative">
            <Input
              label="Full name"
              placeholder="Alice Chen"
              autoComplete="name"
              error={errors.name}
              {...register('name', {
                required: 'Name is required',
                minLength: { value: 2, message: 'Must be at least 2 characters' },
              })}
            />
            <User
              size={16}
              className="pointer-events-none absolute right-3 top-9 text-neutral-500"
            />
          </div>

          {/* ── Email ─────────────────────────────────────────────────── */}
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

          {/* ── Password ──────────────────────────────────────────────── */}
          <div className="relative">
            <Input
              label="Password"
              type="password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              error={errors.password}
              helperText={!errors.password ? 'Minimum 8 characters' : null}
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
            Create account
          </Button>

          <p className="text-center text-sm text-neutral-700">
            Already have an account?{' '}
            <Link to={ROUTES.LOGIN} className="font-semibold text-primary">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </motion.div>
  );
}

/**
 * Inner button used for the role tab-switcher. Kept as a local component
 * so the animated slider background can position itself independently.
 */
function RoleButton({ selected, onClick, icon, label }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={`relative z-10 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors duration-150 ${
        selected ? 'text-white' : 'text-neutral-700 hover:text-neutral-900'
      }`}
    >
      {icon} {label}
    </button>
  );
}
