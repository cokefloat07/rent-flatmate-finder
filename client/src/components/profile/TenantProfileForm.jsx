import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { MapPin, IndianRupee, Calendar, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../common/Button';
import Input from '../common/Input';
import {
  createProfile,
  fetchMyProfile,
  updateProfile,
  deleteMyProfile,
} from '../../services/profile.service';

/**
 * Form for creating or editing a tenant profile.
 *
 * Props:
 *   onSaved — callback after profile is created/updated (parent refreshes)
 */
export default function TenantProfileForm({ onSaved }) {
  const [existingProfile, setExistingProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({ mode: 'onBlur' });

  // ── Load existing profile on mount ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingProfile(true);
      try {
        const profile = await fetchMyProfile();
        if (!cancelled && profile) {
          setExistingProfile(profile);
          reset({
            preferred_location: profile.preferred_location || '',
            budget_min: profile.budget_min || '',
            budget_max: profile.budget_max || '',
            move_in_date: profile.move_in_date?.slice(0, 10) || '',
          });
        }
      } catch {
        // 404 = no profile yet — that's fine, form stays in create mode
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [reset]);

  // ── Submit handler ──────────────────────────────────────────────────────
  const onSubmit = async (values) => {
    const payload = {
      preferred_location: values.preferred_location,
      budget_min: Number(values.budget_min),
      budget_max: Number(values.budget_max),
      move_in_date: values.move_in_date,
    };

    try {
      if (existingProfile) {
        await updateProfile(payload);
        toast.success('Profile updated!');
      } else {
        const created = await createProfile(payload);
        setExistingProfile(created);
        toast.success('Profile created!');
      }
      onSaved?.();
    } catch (err) {
      toast.error(err.userMessage || 'Failed to save profile.');
    }
  };

  // ── Delete handler ──────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!window.confirm('Delete your profile? This cannot be undone.')) return;

    try {
      await deleteMyProfile();
      setExistingProfile(null);
      reset({
        preferred_location: '',
        budget_min: '',
        budget_max: '',
        move_in_date: '',
      });
      toast.success('Profile deleted.');
      onSaved?.();
    } catch (err) {
      toast.error(err.userMessage || 'Failed to delete profile.');
    }
  };

  if (loadingProfile) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-5 w-40" />
        <div className="skeleton h-10 w-full" />
        <div className="skeleton h-10 w-full" />
        <div className="skeleton h-10 w-1/2" />
      </div>
    );
  }

  return (
    <div>
      {/* Status indicator */}
      {existingProfile && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-success/10 px-4 py-2.5 text-sm">
          <span className="text-success font-medium">✓ Profile active — scoring your matches</span>
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1 text-xs font-medium text-danger hover:underline"
          >
            <Trash2 size={12} /> Remove
          </button>
        </div>
      )}

      {!existingProfile && (
        <p className="mb-4 text-sm text-neutral-700">
          Create a profile so our AI can score listings for you. Higher scores mean better matches.
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Preferred location */}
        <div className="relative">
          <Input
            label="Preferred location"
            placeholder="e.g. Indiranagar, Bengaluru"
            error={errors.preferred_location}
            {...register('preferred_location', {
              required: 'Location is required',
              minLength: { value: 2, message: 'Must be at least 2 characters' },
            })}
          />
          <MapPin
            size={16}
            className="pointer-events-none absolute right-3 top-9 text-neutral-500"
          />
        </div>

        {/* Budget range — side by side */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="relative">
            <Input
              label="Min budget (₹/month)"
              type="number"
              placeholder="e.g. 8000"
              min="0"
              error={errors.budget_min}
              {...register('budget_min', {
                required: 'Min budget is required',
                min: { value: 0, message: 'Must be zero or more' },
              })}
            />
            <IndianRupee
              size={16}
              className="pointer-events-none absolute right-3 top-9 text-neutral-500"
            />
          </div>
          <div className="relative">
            <Input
              label="Max budget (₹/month)"
              type="number"
              placeholder="e.g. 15000"
              min="0"
              error={errors.budget_max}
              {...register('budget_max', {
                required: 'Max budget is required',
                min: { value: 0, message: 'Must be zero or more' },
                validate: (val, formValues) =>
                  Number(val) >= Number(formValues.budget_min) ||
                  'Max must be greater than or equal to min',
              })}
            />
            <IndianRupee
              size={16}
              className="pointer-events-none absolute right-3 top-9 text-neutral-500"
            />
          </div>
        </div>

        {/* Move-in date */}
        <Input
          label="Earliest move-in date"
          type="date"
          error={errors.move_in_date}
          {...register('move_in_date', {
            required: 'Move-in date is required',
          })}
        />

        {/* Submit */}
        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" loading={isSubmitting}>
            <Save size={16} />
            {existingProfile ? 'Update profile' : 'Create profile'}
          </Button>

          {isDirty && existingProfile && (
            <span className="text-xs text-neutral-500">You have unsaved changes</span>
          )}
        </div>
      </form>
    </div>
  );
}
