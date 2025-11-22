// Mobile test component to verify mobile functionality
import React from 'react'
import { useMobile } from '@/hooks/useMobile'

export const MobileTest: React.FC = () => {
  const { isMobile } = useMobile()
  
  return (
    <div className="p-4 bg-card rounded-lg border border-border">
      <h3 className="text-lg font-semibold mb-2">Mobile Test</h3>
      <p className="text-muted-foreground">
        Current device: {isMobile ? 'Mobile' : 'Desktop'}
      </p>
      <p className="text-sm mt-2 text-muted-foreground">
        Resize your browser window to test responsive behavior
      </p>
    </div>
  )
}