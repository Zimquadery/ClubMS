import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { FileQuestion } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <FileQuestion className="h-16 w-16 text-muted-foreground mb-4" />
      <h1 className="text-2xl font-bold">Page Not Found</h1>
      <p className="text-muted-foreground mt-2">The page you are looking for does not exist.</p>
      <Link to="/dashboard" className="mt-6">
        <Button className="bg-brand-primary hover:bg-brand-primary/90 text-white">
          Go to Dashboard
        </Button>
      </Link>
    </div>
  )
}
