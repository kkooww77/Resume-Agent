import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../../../lib/utils'

export const BASIC_INFO_CONTROL_CLASS = cn(
  'h-11 w-full rounded-none fresh:rounded-md border px-3',
  'border-black fresh:border-slate-200 bg-white text-[15px] text-slate-800',
  'placeholder:text-slate-400 dark:border-white dark:bg-[#1C1C1C] dark:text-slate-100',
  'transition-[border-color,box-shadow,background-color] duration-150',
  'focus:outline-none focus:ring-2 focus:ring-blue-700 fresh:focus:ring-blue-200',
  'focus:border-black fresh:focus:border-blue-400 dark:focus:ring-blue-900/50',
)

interface BasicInfoFieldProps {
  label: string
  actions?: ReactNode
  className?: string
  children: (controlId: string) => ReactNode
}

export function BasicInfoField({ label, actions, className, children }: BasicInfoFieldProps) {
  const reactId = useId()
  const controlId = `basic-info-${reactId.replace(/:/g, '')}`

  return (
    <div className={cn('min-w-0 space-y-2', className)}>
      <div className="flex h-8 items-center justify-between gap-2">
        <label
          htmlFor={controlId}
          className="font-mono fresh:font-sans text-xs fresh:text-sm font-bold fresh:font-medium text-[#444850] fresh:text-slate-600 dark:text-slate-300"
        >
          {label}
        </label>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {children(controlId)}
    </div>
  )
}

interface BasicInfoInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'onChange' | 'value'> {
  label: string
  value: string
  onValueChange: (value: string) => void
  actions?: ReactNode
  fieldClassName?: string
  inputClassName?: string
}

export function BasicInfoInput({
  label,
  value,
  onValueChange,
  actions,
  fieldClassName,
  inputClassName,
  ...inputProps
}: BasicInfoInputProps) {
  return (
    <BasicInfoField label={label} actions={actions} className={fieldClassName}>
      {(controlId) => (
        <input
          {...inputProps}
          id={controlId}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          className={cn(BASIC_INFO_CONTROL_CLASS, inputClassName)}
        />
      )}
    </BasicInfoField>
  )
}
