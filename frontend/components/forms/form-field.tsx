/**
 * RHF (React Hook Form) Field Components
 *
 * Production-grade reusable form field components with:
 * - Consistent styling via shadcn/ui
 * - colSpan support for grid layouts
 * - Type-safe props with TypeScript
 */

import { type ComponentProps } from 'react';
import {
  FormControl,
  FormDescription,
  FormField as FormFieldUI,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff } from 'lucide-react';
import React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// BASE PROPS
// ============================================================================

export interface BaseRHFProps {
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  colSpan?: 1 | 2 | 3 | 4 | 6 | 12;  // Grid column span (12-column grid)
  className?: string;
}

// Helper to apply colSpan styling
function getColSpanClass(colSpan?: number) {
  if (!colSpan || colSpan === 1) return '';
  // Using Tailwind's grid-column-span utilities
  const spanMap: Record<number, string> = {
    2: 'md:col-span-2',
    3: 'md:col-span-3',
    4: 'md:col-span-4',
    6: 'md:col-span-6',
    12: 'md:col-span-12',
  };
  return spanMap[colSpan] || '';
}

// ============================================================================
// RHF INPUT
// ============================================================================

export interface RHFInputProps extends BaseRHFProps, Omit<ComponentProps<typeof Input>, 'name' | 'id'> {}

/**
 * Standard text input field with React Hook Form integration
 *
 * @example
 * ```tsx
 * <RHFInput
 *   name="email"
 *   label="Email"
 *   type="email"
 *   placeholder="user@example.com"
 *   required
 *   colSpan={2}
 * />
 * ```
 */
export function RHFInput({
  name,
  label,
  description,
  colSpan,
  className,
  ...inputProps
}: RHFInputProps) {
  return (
    <FormFieldUI
      name={name}
      render={({ field }) => (
        <FormItem className={cn(getColSpanClass(colSpan), className)}>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Input {...field} {...inputProps} />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ============================================================================
// RHF PASSWORD
// ============================================================================

export interface RHFPasswordProps extends Omit<BaseRHFProps, 'placeholder'>, Omit<ComponentProps<typeof Input>, 'name' | 'id' | 'type'> {}

/**
 * Password input field with show/hide toggle
 *
 * @example
 * ```tsx
 * <RHFPassword
 *   name="password"
 *   label="Password"
 *   placeholder="••••••••"
 *   required
 * />
 * ```
 */
export function RHFPassword({
  name,
  label,
  description,
  colSpan,
  className,
  ...inputProps
}: RHFPasswordProps) {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <FormFieldUI
      name={name}
      render={({ field }) => (
        <FormItem className={cn(getColSpanClass(colSpan), className)}>
          {label && <FormLabel>{label}</FormLabel>}
          <div className="relative">
            <FormControl>
              <Input
                type={showPassword ? 'text' : 'password'}
                {...field}
                {...inputProps}
              />
            </FormControl>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ============================================================================
// RHF TEXTAREA
// ============================================================================

export interface RHFTextareaProps extends BaseRHFProps {
  rows?: number;
  maxLength?: number;
  showCount?: boolean;
  disabled?: boolean;
}

/**
 * Multi-line text input field
 *
 * @example
 * ```tsx
 * <RHFTextarea
 *   name="bio"
 *   label="Bio"
 *   placeholder="Tell us about yourself..."
 *   rows={4}
 *   maxLength={500}
 *   showCount
 *   colSpan={2}
 * />
 * ```
 */
export function RHFTextarea({
  name,
  label,
  description,
  placeholder,
  colSpan,
  className,
  rows = 3,
  maxLength,
  showCount = false,
  required,
  disabled,
}: RHFTextareaProps) {
  return (
    <FormFieldUI
      name={name}
      render={({ field }) => (
        <FormItem className={cn(getColSpanClass(colSpan), className)}>
          {label && (
            <div className="flex items-center justify-between">
              <FormLabel>{label}</FormLabel>
              {showCount && maxLength && (
                <span className="text-xs text-muted-foreground">
                  {field.value?.length || 0}/{maxLength}
                </span>
              )}
            </div>
          )}
          <FormControl>
            <textarea
              placeholder={placeholder}
              rows={rows}
              maxLength={maxLength}
              required={required}
              disabled={disabled}
              className={cn(
                'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
              )}
              {...field}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ============================================================================
// RHF SELECT
// ============================================================================

export interface RHFSelectProps extends BaseRHFProps {
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Dropdown select field
 *
 * @example
 * ```tsx
 * <RHFSelect
 *   name="role"
 *   label="Role"
 *   options={[
 *     { value: 'admin', label: 'Administrator' },
 *     { value: 'user', label: 'User' },
 *   ]}
 *   placeholder="Select a role"
 *   required
 * />
 * ```
 */
export function RHFSelect({
  name,
  label,
  description,
  placeholder = 'Select an option',
  colSpan,
  className,
  options,
  required,
  disabled,
}: RHFSelectProps) {
  return (
    <FormFieldUI
      name={name}
      render={({ field }) => (
        <FormItem className={cn(getColSpanClass(colSpan), className)}>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <div className="relative">
              <select
                {...field}
                required={required}
                disabled={disabled}
                className={cn(
                  'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                )}
              >
                <option value="">{placeholder}</option>
                {options.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ============================================================================
// RHF SWITCH
// ============================================================================

export interface RHFSwitchProps extends BaseRHFProps {
  description?: string;
}

/**
 * Toggle switch field
 *
 * @example
 * ```tsx
 * <RHFSwitch
 *   name="notifications"
 *   label="Email Notifications"
 *   description="Receive email updates about your activity"
 * />
 * ```
 */
export function RHFSwitch({
  name,
  label,
  description,
  colSpan,
  className,
}: RHFSwitchProps) {
  return (
    <FormFieldUI
      name={name}
      render={({ field }) => (
        <FormItem className={cn(getColSpanClass(colSpan), className)}>
          <div className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              {label && <FormLabel>{label}</FormLabel>}
              {description && <FormDescription>{description}</FormDescription>}
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ============================================================================
// RHF CHECKBOX
// ============================================================================

export interface RHFCheckboxProps extends Omit<BaseRHFProps, 'placeholder'> {
  description?: string;
}

/**
 * Checkbox field with label
 *
 * @example
 * ```tsx
 * <RHFCheckbox
 *   name="terms"
 *   label="I agree to the terms and conditions"
 *   description="Please read and accept our terms"
 *   required
 * />
 * ```
 */
export function RHFCheckbox({
  name,
  label,
  description,
  colSpan,
  className,
  required,
}: RHFCheckboxProps) {
  return (
    <FormFieldUI
      name={name}
      render={({ field }) => (
        <FormItem className={cn(getColSpanClass(colSpan), className)}>
          <div className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
                required={required}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              {label && <FormLabel>{label}</FormLabel>}
              {description && <FormDescription>{description}</FormDescription>}
            </div>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
