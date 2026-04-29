import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function AuthLayout({ description, error, submitLabel, loading, loadingLabel, onSubmit, children, linkText, linkTo, linkLabel, LinkComponent }) {
  const universityName = import.meta.env.VITE_UNIVERSITY_NAME || 'ClubMS'
  const logoUrl = import.meta.env.VITE_LOGO_URL

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {logoUrl && (
            <img src={logoUrl} alt="Logo" className="h-12 w-12 mx-auto mb-2 object-contain" />
          )}
          <CardTitle className="text-2xl font-bold text-brand-primary">{universityName}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {children}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white" disabled={loading}>
              {loading ? loadingLabel : submitLabel}
            </Button>
            <p className="text-sm text-muted-foreground">
              {linkText}{' '}
              <LinkComponent to={linkTo} className="text-brand-primary underline-offset-4 hover:underline">
                {linkLabel}
              </LinkComponent>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
