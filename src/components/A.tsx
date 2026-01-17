// Simple anchor component (replacing next-utils/a)
import { AnchorHTMLAttributes, ReactNode } from 'react'

interface AProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children: ReactNode
}

export default function A({ children, href, target, rel, ...props }: AProps) {
  // Auto-add target="_blank" and rel="noopener noreferrer" for external links
  const isExternal = href?.startsWith('http://') || href?.startsWith('https://')
  const finalTarget = target ?? (isExternal ? '_blank' : undefined)
  const finalRel = rel ?? (isExternal ? 'noopener noreferrer' : undefined)

  return (
    <a href={href} target={finalTarget} rel={finalRel} {...props}>
      {children}
    </a>
  )
}
