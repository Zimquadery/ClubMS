import { useState } from 'react'
import client from '@/api/client'
import { toast } from 'sonner'

export function ImageUploadButton({ onUploadComplete, label }) {
  const [uploading, setUploading] = useState(false)

  return (
    <label className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground cursor-pointer">
      {uploading ? 'Uploading...' : (label || 'Upload')}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files[0]
          if (!file) return
          setUploading(true)
          try {
            const formData = new FormData()
            formData.append('file', file)
            const res = await client.post('/upload', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            })
            onUploadComplete(res.data.url)
          } catch {
            toast.error('Image upload failed')
          } finally {
            setUploading(false)
          }
        }}
      />
    </label>
  )
}
