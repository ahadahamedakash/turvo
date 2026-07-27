/**
 * Form Layout Components
 *
 * Layout components for structuring forms with consistent spacing and responsive behavior
 */

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// FORM GRID
// ============================================================================

export interface FormGridProps {
  children: ReactNode;
  cols?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Responsive grid container for form fields
 * Uses CSS Grid with auto-fit for responsive behavior
 *
 * @example
 * ```tsx
 * <FormGrid cols={2}>
 *   <RHFInput name="firstName" label="First Name" />
 *   <RHFInput name="lastName" label="Last Name" />
 *   <RHFInput name="email" label="Email" colSpan={2} />
 * </FormGrid>
 * ```
 */
export function FormGrid({
  children,
  cols = 1,
  gap = 'md',
  className,
}: FormGridProps) {
  const colsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }[cols];

  const gapClass = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
  }[gap];

  return (
    <div className={cn('grid', colsClass, gapClass, className)}>
      {children}
    </div>
  );
}

// ============================================================================
// FORM ROW
// ============================================================================

export interface FormRowProps {
  children: ReactNode;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
  align?: 'start' | 'center' | 'end';
}

/**
 * Horizontal row for related form fields
 *
 * @example
 * ```tsx
 * <FormRow>
 *   <RHFInput name="city" label="City" />
 *   <RHFInput name="state" label="State" />
 *   <RHFInput name="zip" label="ZIP" />
 * </FormRow>
 * ```
 */
export function FormRow({
  children,
  gap = 'md',
  className,
  align = 'start',
}: FormRowProps) {
  const gapClass = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
  }[gap];

  const alignClass = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
  }[align];

  return (
    <div className={cn('flex flex-row flex-wrap', gapClass, alignClass, className)}>
      {children}
    </div>
  );
}

// ============================================================================
// FORM SECTION
// ============================================================================

export interface FormSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'compact' | 'separated';
}

/**
 * Grouped section with optional title and description
 *
 * @example
 * ```tsx
 * <FormSection
 *   title="Personal Information"
 *   description="Tell us about yourself"
 * >
 *   <FormGrid cols={2}>
 *     <RHFInput name="firstName" label="First Name" />
 *     <RHFInput name="lastName" label="Last Name" />
 *   </FormGrid>
 * </FormSection>
 * ```
 */
export function FormSection({
  title,
  description,
  children,
  className,
  variant = 'default',
}: FormSectionProps) {
  const variantClass = {
    default: 'space-y-4',
    compact: 'space-y-3',
    separated: 'space-y-6',
  }[variant];

  return (
    <div className={cn(variantClass, className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-lg font-semibold leading-none tracking-tight">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

// ============================================================================
// FORM FIELDSET
// ============================================================================

export interface FormFieldsetProps {
  legend?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Fieldset for semantic grouping of related fields
 *
 * @example
 * ```tsx
 * <FormFieldset legend="Address">
 *   <RHFInput name="street" label="Street Address" />
 *   <RHFInput name="city" label="City" />
 * </FormFieldset>
 * ```
 */
export function FormFieldset({
  legend,
  children,
  className,
}: FormFieldsetProps) {
  return (
    <fieldset className={cn('space-y-4', className)}>
      {legend && (
        <legend className="text-sm font-medium leading-none text-foreground">
          {legend}
        </legend>
      )}
      {children}
    </fieldset>
  );
}
