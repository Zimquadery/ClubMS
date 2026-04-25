function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-brand-primary mb-4">
          {import.meta.env.VITE_UNIVERSITY_NAME || 'ClubMS'}
        </h1>
        <p className="text-gray-600">University Club Management Platform</p>
      </div>
    </div>
  )
}

export default App
