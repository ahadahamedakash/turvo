/**
 * Form Action Components
 *
 * Consistent button/action patterns for forms
 */

import { type ReactNode, type ButtonHTMLAttributes } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  children: ReactNode;
}

/**
 * Submit button with loading state
 *
 * @example
 * ```tsx
 * <SubmitButton isLoading={isSubmitting} loadingText="Signing in...">
 *   Sign In
 * </SubmitButton>
 * ```
 */
export function SubmitButton({
  isLoading = false,
  loadingText,
  children,
  disabled,
  className,
  ...props
}: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={disabled || isLoading}
      className={cn('w-full', className)}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingText || 'Submitting...'}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

export interface FormActionsProps {
  /**
   * Primary action (submit)
   */
  primary: {
    label: string;
    loadingLabel?: string;
    isLoading?: boolean;
    disabled?: boolean;
    onClick?: () => void;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  };
  /**
   * Secondary action (cancel, back, etc.)
   */
  secondary?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  };
  /**
   * Additional alignment for actions
   */
  align?: 'left' | 'center' | 'right' | 'space-between';
  /**
   * Additional class names
   */
  className?: string;
}

/**
 * Form action buttons container
 *
 * @example
 * ```tsx
 * <FormActions
 *   primary={{ label: 'Save', isLoading: isSubmitting }}
 *   secondary={{ label: 'Cancel', onClick: handleCancel }}
 *   align="right"
 * />
 * ```
 */
export function FormActions({
  primary,
  secondary,
  align = 'right',
  className,
}: FormActionsProps) {
  const alignmentClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    'space-between': 'justify-between',
  }[align];

  return (
    <div className={cn('flex items-center gap-3', alignmentClass, className)}>
      {secondary && align === 'space-between' && (
        <Button
          type="button"
          variant={secondary.variant || 'outline'}
          onClick={secondary.onClick}
          disabled={secondary.disabled}
        >
          {secondary.label}
        </Button>
      )}

      <SubmitButton
        isLoading={primary.isLoading}
        loadingText={primary.loadingLabel}
        disabled={primary.disabled}
        {...(primary.variant ? { variant: primary.variant } : {})}
        type="submit"
      >
        {primary.label}
      </SubmitButton>

      {secondary && align !== 'space-between' && (
        <Button
          type="button"
          variant={secondary.variant || 'outline'}
          onClick={secondary.onClick}
          disabled={secondary.disabled}
        >
          {secondary.label}
        </Button>
      )}
    </div>
  );
}

export interface FormErrorProps {
  message?: string | null;
  className?: string;
}

/**
 * Form-level error display
 *
 * @example
 * ```tsx
 * <FormError message={formError} />
 * ```
 */
export function FormError({ message, className }: FormErrorProps) {
  if (!message) return null;

  return (
    <div className={cn('rounded-md bg-destructive/10 p-3 text-sm text-destructive', className)}>
      {message}
    </div>
  );
}

export interface FormSuccessProps {
  message?: string | null;
  className?: string;
}

/**
 * Form-level success display
 *
 * @example
 * ```tsx
 * <FormSuccess message={successMessage} />
 * ```
 */
export function FormSuccess({ message, className }: FormSuccessProps) {
  if (!message) return null;

  return (
    <div className={cn('rounded-md bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400', className)}>
      {message}
    </div>
  );
}

/**
 * Form footer with additional links
 *
 * @example
 * ```tsx
 * <FormFooter>
 *   <Link href="/forgot-password">Forgot password?</Link>
 *   <Link href="/register">Don't have an account? Sign up</Link>
 * </FormFooter>
 * ```
 */
export function FormFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-2 text-sm text-muted-foreground', className)}>
      {children}
    </div>
  );
}

/**
 * Single link in form footer
 */
export function FormFooterLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className="text-sm font-medium text-primary hover:underline underline-offset-4"
    >
      {children}
    </a>
  );
}
