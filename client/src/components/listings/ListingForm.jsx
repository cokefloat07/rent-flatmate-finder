import { useForm } from 'react-hook-form';
import { MapPin, IndianRupee, Calendar, Bed, Armchair } from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../common/Button';
import Input from '../common/Input';
import { ROOM_TYPES, FURNISHING_STATUSES } from '../../utils/constants';
import { createListing, updateListing } from '../../services/listing.service';

/**
 * Create or edit a room listing.
 *
 * Props:
 *   listing    — existing listing object for edit mode, or null for create
 *   onSuccess  — callback after successful save (parent refreshes list)
 *   onClose    — callback to close the modal
 */
export default function ListingForm({ listing = null, onSuccess, onClose }) {
  const isEdit = !!listing;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onBlur',
    defaultValues: {
      location: listing?.location || '',
      rent: listing?.rent || '',
      available_from: listing?.available_from?.slice(0, 10) || '',
      room_type: listing?.room_type || '',
      furnishing_status: listing?.furnishing_status || '',
      photos: listing?.photos?.join(', ') || '',
    },
  });

  const onSubmit = async (values) => {
    try {
      // Convert photos from comma-separated string to array
      const photoArray = values.photos
        ? values.photos
            .split(',')
            .map((u) => u.trim())
            .filter(Boolean)
        : [];

      const payload = {
        location: values.location,
        rent: Number(values.rent),
        available_from: values.available_from,
        room_type: values.room_type,
        furnishing_status: values.furnishing_status,
        photos: photoArray,
      };

      if (isEdit) {
        await updateListing(listing.id, payload);
        toast.success('Listing updated!');
      } else {
        await createListing(payload);
        toast.success('Listing posted!');
      }

      onSuccess?.();
      onClose?.();
    } catch (err) {
      toast.error(err.userMessage || 'Failed to save listing.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Location */}
      <div className="relative">
        <Input
          label="Location"
          placeholder="e.g. Indiranagar, Bengaluru"
          error={errors.location}
          {...register('location', {
            required: 'Location is required',
            minLength: { value: 2, message: 'Must be at least 2 characters' },
          })}
        />
        <MapPin size={16} className="pointer-events-none absolute right-3 top-9 text-neutral-500" />
      </div>

      {/* Rent */}
      <div className="relative">
        <Input
          label="Rent (₹/month)"
          type="number"
          placeholder="e.g. 12000"
          min="1"
          error={errors.rent}
          {...register('rent', {
            required: 'Rent is required',
            min: { value: 1, message: 'Must be a positive number' },
          })}
        />
        <IndianRupee
          size={16}
          className="pointer-events-none absolute right-3 top-9 text-neutral-500"
        />
      </div>

      {/* Available from */}
      <Input
        label="Available from"
        type="date"
        error={errors.available_from}
        {...register('available_from', {
          required: 'Date is required',
        })}
      />

      {/* Room type + Furnishing (side by side) */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-900">
            <Bed size={13} className="mr-1 inline" /> Room type
          </label>
          <select
            className={`input-base ${errors.room_type ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`}
            {...register('room_type', { required: 'Required' })}
          >
            <option value="">Select…</option>
            {ROOM_TYPES.map((rt) => (
              <option key={rt.value} value={rt.value}>
                {rt.label}
              </option>
            ))}
          </select>
          {errors.room_type && (
            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-danger">
              ⚠ {errors.room_type.message}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-900">
            <Armchair size={13} className="mr-1 inline" /> Furnishing
          </label>
          <select
            className={`input-base ${errors.furnishing_status ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`}
            {...register('furnishing_status', { required: 'Required' })}
          >
            <option value="">Select…</option>
            {FURNISHING_STATUSES.map((fs) => (
              <option key={fs.value} value={fs.value}>
                {fs.label}
              </option>
            ))}
          </select>
          {errors.furnishing_status && (
            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-danger">
              ⚠ {errors.furnishing_status.message}
            </p>
          )}
        </div>
      </div>

      {/* Photos (URLs, comma-separated) */}
      <Input
        label="Photo URLs (optional)"
        placeholder="https://example.com/photo1.jpg, https://example.com/photo2.jpg"
        helperText="Separate multiple URLs with commas"
        error={errors.photos}
        {...register('photos')}
      />

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={onClose} type="button">
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {isEdit ? 'Save changes' : 'Post listing'}
        </Button>
      </div>
    </form>
  );
}
