import * as React from "react"

// Context to share auto-generated IDs between Dialog and its children
interface DialogContextValue {
  titleId: string
  descriptionId: string
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

function useDialogContext() {
  return React.useContext(DialogContext)
}

export interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
  'aria-labelledby'?: string
  'aria-describedby'?: string
}

const Dialog: React.FC<DialogProps> = ({
  open,
  onOpenChange,
  children,
  'aria-labelledby': ariaLabelledbyProp,
  'aria-describedby': ariaDescribedbyProp
}) => {
  const dialogRef = React.useRef<HTMLDivElement>(null)
  const previouslyFocusedRef = React.useRef<HTMLElement | null>(null)

  // Auto-generate unique IDs for title and description
  const generatedId = React.useId()
  const titleId = ariaLabelledbyProp || `dialog-title-${generatedId}`
  const descriptionId = ariaDescribedbyProp || `dialog-description-${generatedId}`

  React.useEffect(() => {
    if (open) {
      // Store the currently focused element to restore focus later (with proper type checking)
      const activeEl = document.activeElement
      previouslyFocusedRef.current = activeEl instanceof HTMLElement ? activeEl : null

      // Disable body scroll
      document.body.style.overflow = 'hidden'

      // Focus the first focusable element in the dialog
      const focusFirstElement = () => {
        if (!dialogRef.current) return

        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [contenteditable], [tabindex]:not([tabindex="-1"])'
        )

        if (focusableElements.length > 0) {
          focusableElements[0].focus()
        } else {
          // If no focusable elements, focus the dialog itself
          dialogRef.current.focus()
        }
      }

      // Small delay to ensure DOM is ready
      requestAnimationFrame(focusFirstElement)

      // Handle keyboard events for focus trapping and ESC to close
      const handleKeyDown = (e: KeyboardEvent) => {
        // Close on ESC
        if (e.key === 'Escape') {
          e.preventDefault()
          onOpenChange?.(false)
          return
        }

        // Focus trapping on Tab
        if (e.key === 'Tab' && dialogRef.current) {
          const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [contenteditable], [tabindex]:not([tabindex="-1"])'
          )

          if (focusableElements.length === 0) return

          const firstElement = focusableElements[0]
          const lastElement = focusableElements[focusableElements.length - 1]

          // Shift + Tab from first element -> go to last
          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
          // Tab from last element -> go to first
          else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }

      document.addEventListener('keydown', handleKeyDown)

      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = 'unset'

        // Restore focus to the element that opened the dialog
        if (previouslyFocusedRef.current && typeof previouslyFocusedRef.current.focus === 'function') {
          previouslyFocusedRef.current.focus()
        }
      }
    } else {
      document.body.style.overflow = 'unset'
    }
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <DialogContext.Provider value={{ titleId, descriptionId }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop - clicking closes the dialog */}
        <div
          className="fixed inset-0 bg-deep-space-950/60 backdrop-blur-sm"
          onClick={() => onOpenChange?.(false)}
          aria-hidden="true"
        />
        {/* Dialog container with focus trap and ARIA attributes */}
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          tabIndex={-1}
          className="relative z-50 outline-none"
        >
          {children}
        </div>
      </div>
    </DialogContext.Provider>
  )
}

const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`relative z-50 w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg border border-deep-space-200 ${className}`}
    {...props}
  />
))

DialogContent.displayName = "DialogContent"

const DialogHeader = ({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex flex-col space-y-1.5 text-center sm:text-left ${className}`} {...props} />
)

DialogHeader.displayName = "DialogHeader"

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className = '', id: idProp, ...props }, ref) => {
  const context = useDialogContext()
  // Use provided id, or auto-generated from context, or undefined
  const id = idProp || context?.titleId

  return (
    <h2
      ref={ref}
      id={id}
      className={`text-lg font-semibold leading-none tracking-tight text-deep-space-900 ${className}`}
      {...props}
    />
  )
})

DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className = '', id: idProp, ...props }, ref) => {
  const context = useDialogContext()
  // Use provided id, or auto-generated from context, or undefined
  const id = idProp || context?.descriptionId

  return (
    <p
      ref={ref}
      id={id}
      className={`text-sm text-deep-space-500 ${className}`}
      {...props}
    />
  )
})

DialogDescription.displayName = "DialogDescription"

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription }
