import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ArrowLeft, CircleAlert, Loader2 } from 'lucide-react'

export function AuthLayout({ description, error, submitLabel, loading, loadingLabel, onSubmit, children, linkText, linkTo, linkLabel }) {
  const universityName = import.meta.env.VITE_UNIVERSITY_NAME || 'ClubMS'
  const logoUrl = import.meta.env.VITE_LOGO_URL

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-muted/40 px-4 py-20">
      <div className="absolute top-0 inset-x-0 container mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          to="/"
          className="flex h-10 items-center gap-1.5 px-2 -ml-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md t-auth-enter">
        <CardHeader className="text-center">
          {logoUrl && (
            <img src={logoUrl} alt="Logo" className="h-12 w-12 mx-auto mb-3 object-contain" />
          )}
          <CardTitle className="text-xl font-semibold tracking-tight text-foreground">{universityName}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div
                role="alert"
                className="animate-fade-in flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
              >
                <CircleAlert className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {children}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? loadingLabel : submitLabel}
            </Button>
            <p className="text-sm text-muted-foreground">
              {linkText}{' '}
              <Link to={linkTo} className="text-brand-primary underline-offset-4 hover:underline">
                {linkLabel}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
