import * as React from "react"
import { Upload, File, X, CheckCircle, AlertCircle } from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "./Button"

interface FileUploaderProps {
  onFileSelect: (file: File | null) => void
  accept?: string
  maxSize?: number // in bytes
  className?: string
  disabled?: boolean
}

export function FileUploader({ 
  onFileSelect, 
  accept = ".zip", 
  maxSize = 50 * 1024 * 1024, // 50MB default
  className,
  disabled = false 
}: FileUploaderProps) {
  const [isDragOver, setIsDragOver] = React.useState(false)
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [error, setError] = React.useState<string>("")
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (maxSize && file.size > maxSize) {
      return `File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`
    }
    
    if (accept && !accept.split(',').some(type => 
      file.name.toLowerCase().endsWith(type.trim().toLowerCase()) ||
      file.type.match(type.trim().replace('*', '.*'))
    )) {
      return `File type must be ${accept}`
    }
    
    return null
  }

  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      setSelectedFile(null)
      onFileSelect(null)
      return
    }
    
    setError("")
    setSelectedFile(file)
    onFileSelect(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    if (disabled) return
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setError("")
    onFileSelect(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200",
          isDragOver && !disabled
            ? "border-primary bg-primary/5 scale-105"
            : "border-border hover:border-primary/50 hover:bg-muted/30",
          disabled && "opacity-50 cursor-not-allowed",
          error && "border-destructive bg-destructive/5"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />
        
        <div className="space-y-3">
          <div className={cn(
            "w-12 h-12 mx-auto rounded-full flex items-center justify-center transition-colors",
            isDragOver && !disabled ? "bg-primary text-primary-foreground" : "bg-muted"
          )}>
            <Upload className="h-6 w-6" />
          </div>
          
          <div>
            <p className="text-sm font-medium">
              {isDragOver ? "Drop your file here" : "Drop your ZIP file here, or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports {accept} files up to {Math.round(maxSize / (1024 * 1024))}MB
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Selected File */}
      {selectedFile && !error && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 border rounded-md">
          <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <File className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRemoveFile}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}