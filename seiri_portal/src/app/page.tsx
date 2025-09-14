export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto text-center px-4">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Seiri Studios
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Professional workspace management and client collaboration platform. 
          Streamline your projects with intelligent task organization and team coordination.
        </p>
        
        <div className="grid md:grid-cols-2 gap-8 mt-12">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Client Portal</h2>
            <p className="text-gray-600 mb-6">
              Access your project dashboard, track progress, and collaborate with your team.
            </p>
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
              Access Portal
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Landing Page</h2>
            <p className="text-gray-600 mb-6">
              Learn more about our workspace management solutions and features.
            </p>
            <button className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors">
              Learn More
            </button>
          </div>
        </div>
        
        <div className="mt-12 text-sm text-gray-500">
          <p>© 2024 Seiri Studios - Professional Workspace Management</p>
        </div>
      </div>
    </div>
  )
}