const MODULES = [
  { name: 'Reading', href: '/practice/reading', ready: true },
  { name: 'Listening', href: '/practice/listening', ready: true },
  { name: 'Writing', href: '/practice/writing', ready: false },
  { name: 'Speaking', href: '/practice/speaking', ready: false },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen">
      <header className="flex justify-between items-center p-6 border-b">
        <div className="font-semibold text-lg">IELTS Try Again</div>
        <div className="text-sm text-gray-600">Test Student</div>
      </header>

      <main className="p-8">
        <h1 className="text-xl font-semibold mb-6">Practice Modules</h1>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {MODULES.map((m) => (
            <a
              key={m.name}
              href={m.ready ? m.href : '#'}
              className={`border rounded-lg p-6 text-center ${
                m.ready ? 'hover:shadow-md' : 'opacity-40 pointer-events-none'
              }`}
            >
              <h3 className="font-medium">{m.name}</h3>
              {!m.ready && <p className="text-xs text-gray-400 mt-1">Coming Soon</p>}
            </a>
          ))}
        </div>

        <div className="border rounded-lg p-6 max-w-sm">
          <h3 className="font-medium mb-1">Full Mock Test</h3>
          <p className="text-xs text-gray-400">Coming Soon</p>
        </div>
      </main>

      <footer className="text-center text-xs text-gray-400 py-6">Powered by IELTS Try Again</footer>
    </div>
  );
}