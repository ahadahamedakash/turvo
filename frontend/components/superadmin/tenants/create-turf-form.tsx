/**
 * Create Turf Form
 *
 * Form for creating a new turf/tenant organization
 */

'use client'

import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createTenantSchema, slugFromName } from '@/lib/schemas/tenant'
import { useCreateTenant } from '@/hooks/tenants'
import type { CreateTenantSchema } from '@/lib/schemas/tenant'
import { RHFInput, RHFTextarea, RHFSelect } from '@/components/forms/form-field'
import { FormGrid, FormSection } from '@/components/forms/form-layout'
import { FormActions, FormError } from '@/components/forms/form-actions'
import { Form } from '@/components/ui/form'
import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'

/**
 * Common timezone options
 */
const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC (Universal Coordinated Time)' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European Time' },
  { value: 'Asia/Dubai', label: 'Dubai (Gulf Standard Time)' },
  { value: 'Asia/Kolkata', label: 'India Standard Time' },
  { value: 'Asia/Dhaka', label: 'Bangladesh Standard Time' },
  { value: 'Asia/Singapore', label: 'Singapore Time' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
]

/**
 * Available operating hour options (in 30-minute increments)
 */
const HOUR_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2)
  const minute = (i % 2) * 30
  const value = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  const display = hour === 0
    ? `12:${minute.toString().padStart(2, '0')} AM`
    : hour < 12
    ? `${hour}:${minute.toString().padStart(2, '0')} AM`
    : hour === 12
    ? `12:${minute.toString().padStart(2, '0')} PM`
    : `${hour - 12}:${minute.toString().padStart(2, '0')} PM`
  return { value, label: display }
})

interface CreateTurfFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

/**
 * Create turf form component
 */
export function CreateTurfForm({ onSuccess, onCancel }: CreateTurfFormProps) {
  const createTenant = useCreateTenant()
  const [slugGenerated, setSlugGenerated] = useState(false)

  const form = useForm<CreateTenantSchema>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      address: '',
      timezone: '',
      website: '',
      openingHour: '',
      closingHour: '',
    },
    mode: 'onBlur', // Validate on blur for better UX
  })

  // Auto-generate slug from name
  const nameValue = useWatch({ control: form.control, name: 'name' })
  const slugValue = useWatch({ control: form.control, name: 'slug' })

  useEffect(() => {
    if (nameValue && !slugGenerated) {
      const generatedSlug = slugFromName(nameValue)
      form.setValue('slug', generatedSlug)
      setSlugGenerated(true)
    }
  }, [nameValue, form, slugGenerated])

  // Allow manual slug editing
  const handleNameChange = () => {
    setSlugGenerated(false)
  }

  const onSubmit = async (values: CreateTenantSchema) => {
    createTenant.mutate(values, {
      onSuccess: () => {
        form.reset()
        onSuccess?.()
      },
    })
  }

  const openingHour = form.watch('openingHour')
  const closingHour = form.watch('closingHour')

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormSection
          title="Turf Information"
          description="Enter the basic details for your new turf organization"
        >
          <FormGrid>
            <RHFInput
              name="name"
              label="Turf Name"
              placeholder="Downtown Sports Arena"
              description="The public name of your turf organization"
              required
              onChange={handleNameChange}
              colSpan={2}
            />

            <RHFInput
              name="slug"
              label="URL Slug"
              placeholder="downtown-sports-arena"
              description="Used in URLs and cannot be changed later"
              required
              colSpan={2}
            />
            {slugValue && (
              <div className="flex items-center justify-end gap-1 text-xs text-green-600 dark:text-green-400 ml-2">
                <Check className="h-3 w-3" />
                <span>Slug available</span>
              </div>
            )}

            <RHFTextarea
              name="description"
              label="Description"
              placeholder="Premium indoor sports facility with multiple courts..."
              description="Brief description of your turf (optional)"
              rows={3}
              colSpan={2}
            />

            <RHFTextarea
              name="address"
              label="Address"
              placeholder="123 Main Street, Dhaka, Bangladesh"
              description="Physical location of your turf (optional)"
              rows={2}
              colSpan={2}
            />
          </FormGrid>
        </FormSection>

        <FormSection
          title="Contact & Hours"
          description="Set up contact information and operating hours"
        >
          <FormGrid>
            <RHFInput
              name="website"
              label="Website"
              placeholder="https://yourwebsite.com"
              description="Your turf website URL (optional)"
              colSpan={2}
            />

            <RHFSelect
              name="timezone"
              label="Timezone"
              placeholder="Select timezone"
              options={TIMEZONE_OPTIONS}
              description="Your turf's local timezone (optional)"
              colSpan={2}
            />

            <RHFSelect
              name="openingHour"
              label="Opening Time"
              placeholder="Select opening time"
              options={HOUR_OPTIONS}
              description="When your turf opens (optional)"
              colSpan={1}
            />

            <RHFSelect
              name="closingHour"
              label="Closing Time"
              placeholder="Select closing time"
              options={HOUR_OPTIONS}
              description="When your turf closes (optional)"
              colSpan={1}
            />
          </FormGrid>

          {/* Validation error for hours */}
          {form.formState.errors.closingHour &&
            openingHour &&
            closingHour &&
            closingHour <= openingHour && (
            <FormError message="Closing time must be after opening time" />
          )}
        </FormSection>

        <FormActions
          primary={{
            label: 'Create Turf',
            loadingLabel: 'Creating turf...',
            isLoading: createTenant.isPending,
          }}
          secondary={
            onCancel
              ? {
                  label: 'Cancel',
                  onClick: onCancel,
                }
              : undefined
          }
        />
      </form>
    </Form>
  )
}
