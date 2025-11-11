import { Wifi, WifiOff, AlertCircle } from 'lucide-react'
import type { ConnectionStatus as Status } from '../../hooks/useRealTimeDeployments'

interface ConnectionStatusProps {
  status: Status
  className?: string
  showLabel?: boolean
}

/**
 * Connection status indicator for WebSocket connection
 * 
 * Shows visual feedback for connection state:
 * - Connected: Green indicator
 * - Connecting: Yellow pulsing indicator
 * - Disconnected/Error: Red indicator
 */
export function ConnectionStatus({ 
  status, 
  className = '',
  showLabel = true 
}: ConnectionStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          color: 'text-green-500',
          bgColor: 'bg-green-500',
          label: 'Live',
          animate: false
        }
      case 'connecting':
        return {
          icon: Wifi,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500',
          label: 'Connecting',
          animate: true
        }
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-500',
          label: 'Error',
          animate: false
        }
      case 'disconnected':
      default:
        return {
          icon: WifiOff,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted-foreground',
          label: 'Offline',
          animate: false
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative flex items-center">
        {config.animate && (
          <span className="absolute inline-flex h-full w-full">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.bgColor} opacity-75`}></span>
          </span>
        )}
        <Icon className={`h-4 w-4 ${config.color} relative`} />
      </div>
      {showLabel && (
        <span className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </span>
      )}
    </div>
  )
}

