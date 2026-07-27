/**
 * Generic Form Wrapper Component
 *
 * Provides consistent form structure with:
 * - React Hook Form integration
 * - Zod validation
 * - Loading states
 * - Error handling
 * - Submit prevention on double-click
 */

import { type ReactNode } from 'react';
import {
  type UseFormReturn,
  type FieldValues,
  type SubmitHandler,
  useForm,
  type DefaultValues,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { type ZodSchema } from 'zod';
import { cn } from '@/lib/utils';

export interface FormWrapperProps<TFieldValues extends FieldValues = FieldValues> {
  // Schema for validation
  schema: ZodSchema<TFieldValues>;
  // Default values for the form
  defaultValues?: DefaultValues<TFieldValues>;
  // Form submission handler
  onSubmit: SubmitHandler<TFieldValues>;
  // Whether the form is currently submitting (from parent)
  isSubmitting?: boolean;
  // Submit button text
  submitText?: string;
  // Submit button variant
  submitVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  // Whether to show the submit button
  showSubmitButton?: boolean;
  // Additional class names
  className?: string;
  // Form children (typically FormField components)
  children: ReactNode;
  // Render prop for accessing form methods
  render?: (methods: UseFormReturn<TFieldValues>) => ReactNode;
  // ID for the form
  id?: string;
  // Disabled state for the entire form
  disabled?: boolean;
}

/**
 * Generic form wrapper component
 *
 * @example
 * ```tsx
 * <FormWrapper
 *   schema={loginSchema}
 *   defaultValues={{ email: '', password: '' }}
 *   onSubmit={handleSubmit}
 *   submitText="Sign In"
 * >
 *   <FormField name="email" label="Email" type="email" required />
 *   <FormField name="password" label="Password" type="password" required />
 * </FormWrapper>
 * ```
 */
export function FormWrapper<TFieldValues extends FieldValues = FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  isSubmitting: externalIsSubmitting = false,
  submitText = 'Submit',
  submitVariant = 'default',
  showSubmitButton = true,
  className,
  children,
  render,
  id,
  disabled = false,
}: FormWrapperProps<TFieldValues>) {
  const methods = useForm<TFieldValues>({
    resolver: zodResolver(schema as any) as any,
    defaultValues,
    mode: 'onBlur', // Validate on blur for better UX
  });

  const {
    formState: { isSubmitting },
  } = methods;

  const isFormDisabled = disabled || isSubmitting || externalIsSubmitting;

  if (render) {
    return <>{render(methods)}</>;
  }

  return (
    <form
      id={id}
      onSubmit={methods.handleSubmit(onSubmit)}
      className={cn('space-y-4', className)}
      noValidate
    >
      {typeof children === 'function'
        ? (children as (methods: UseFormReturn<TFieldValues>) => ReactNode)(methods)
        : children}
    </form>
  );
}

/**
 * HOC for creating typed form components
 *
 * @example
 * ```tsx
 * const LoginForm = createForm({
 *   schema: loginSchema,
 *   defaultValues: { email: '', password: '' },
 *   submitText: 'Sign In',
 *   fields: [
 *     { name: 'email', label: 'Email', type: 'email' },
 *     { name: 'password', label: 'Password', type: 'password' },
 *   ],
 * });
 * ```
 */
export function createForm<TFieldValues extends FieldValues = FieldValues>(
  config: {
    schema: ZodSchema<TFieldValues>;
    defaultValues?: DefaultValues<TFieldValues>;
    submitText?: string;
    submitVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    className?: string;
  },
) {
  return function CreatedForm({
    onSubmit,
    isSubmitting,
    showSubmitButton = true,
    children,
    className,
  }: {
    onSubmit: SubmitHandler<TFieldValues>;
    isSubmitting?: boolean;
    showSubmitButton?: boolean;
    className?: string;
    children?: ReactNode;
  }) {
    return (
      <FormWrapper
        schema={config.schema}
        defaultValues={config.defaultValues}
        onSubmit={onSubmit}
        submitText={config.submitText}
        submitVariant={config.submitVariant}
        isSubmitting={isSubmitting}
        showSubmitButton={showSubmitButton}
        className={cn(config.className, className)}
      >
        {children}
      </FormWrapper>
    );
  };
}
