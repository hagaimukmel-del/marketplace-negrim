'use client'

export default function DesignSystemPage() {
  const colors = [
    { name: 'Primary (Wood Brown)', hex: '#8b6f47', desc: 'Main brand color' },
    { name: 'Primary Dark', hex: '#5d4a2f', desc: 'Deep wood' },
    { name: 'Primary Light', hex: '#e8dcc8', desc: 'Light warm beige' },
    { name: 'Secondary (Gold)', hex: '#d4af37', desc: 'Accent gold' },
    { name: 'Accent (Forest)', hex: '#2d9d78', desc: 'CTAs & highlights' },
    { name: 'Success', hex: '#22c55e', desc: 'Positive actions' },
    { name: 'Warning', hex: '#f59e0b', desc: 'Caution' },
    { name: 'Error', hex: '#ef4444', desc: 'Errors & alerts' },
  ]

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-2xl p-12 border border-amber-200">
        <h1 className="text-5xl font-bold text-gray-900">🎨 Design System</h1>
        <p className="text-gray-700 mt-4 text-lg">Marketplace Negrim — Modern Woodworking Design</p>
      </div>

      {/* Color Palette */}
      <section className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">🎭 Color Palette</h2>
          <p className="text-gray-600">Warm wood tones with gold accents inspired by craftsmanship</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {colors.map((color) => (
            <div key={color.hex} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div
                style={{ backgroundColor: color.hex }}
                className="h-24 w-full"
              />
              <div className="p-4">
                <h3 className="font-bold text-gray-900">{color.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{color.desc}</p>
                <code className="text-xs text-gray-500 mt-2 block">{color.hex}</code>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">📝 Typography</h2>
          <p className="text-gray-600">Poppins for headlines, DM Sans for body text</p>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 space-y-8">
          <div>
            <h1 className="text-4xl font-bold">Heading 1 (h1) — 2.5rem</h1>
            <p className="text-sm text-gray-500 mt-2">Poppins 800, tight line height</p>
          </div>

          <div>
            <h2 className="text-3xl font-bold">Heading 2 (h2) — 2rem</h2>
            <p className="text-sm text-gray-500 mt-2">Poppins 700</p>
          </div>

          <div>
            <h3 className="text-2xl font-bold">Heading 3 (h3) — 1.5rem</h3>
            <p className="text-sm text-gray-500 mt-2">Poppins 600</p>
          </div>

          <div>
            <p className="text-base">Body text (16px) — DM Sans 400, line-height 1.6</p>
            <p className="text-sm text-gray-500 mt-2">Used for paragraphs and main content</p>
          </div>

          <div>
            <p className="text-sm">Small text (14px) — DM Sans 400</p>
            <p className="text-xs text-gray-500 mt-2">Used for captions, labels, descriptions</p>
          </div>
        </div>
      </section>

      {/* Components */}
      <section className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">🧩 Components</h2>
          <p className="text-gray-600">Pre-built interactive elements</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Buttons */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Buttons</h3>
            <div className="space-y-3">
              <button className="w-full px-6 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 font-semibold">
                Primary Button
              </button>
              <button className="w-full px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold">
                Success Button
              </button>
              <button className="w-full px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold">
                Secondary Button
              </button>
            </div>
          </div>

          {/* Cards */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Cards</h3>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h4 className="font-bold text-gray-900">Card Title</h4>
              <p className="text-sm text-gray-600 mt-2">Card content goes here with support for rich text</p>
            </div>
          </div>

          {/* Badges */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Badges</h3>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-semibold">Active</span>
              <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-semibold">Pending</span>
              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">Error</span>
            </div>
          </div>

          {/* Forms */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Form Elements</h3>
            <input
              type="text"
              placeholder="Text input"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-700 outline-none mb-3"
            />
            <textarea
              placeholder="Textarea"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-700 outline-none"
              rows={3}
            />
          </div>
        </div>
      </section>

      {/* Spacing Scale */}
      <section className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">📐 Spacing Scale</h2>
          <p className="text-gray-600">Consistent spacing using Tailwind defaults</p>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <div className="grid grid-cols-4 gap-4">
            {[2, 4, 8, 16, 24, 32].map((space) => (
              <div key={space} className="text-center">
                <div
                  style={{
                    width: `${Math.min(space * 4, 100)}px`,
                    height: `${Math.min(space * 4, 100)}px`,
                    backgroundColor: '#8b6f47',
                  }}
                  className="mx-auto rounded mb-2"
                />
                <p className="text-sm font-semibold text-gray-900">{space}px</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Usage Guidelines */}
      <section className="bg-amber-50 rounded-2xl p-8 border border-amber-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">📋 Usage Guidelines</h2>
        <ul className="space-y-2 text-gray-700">
          <li>✅ Use wood brown (#8b6f47) for primary CTAs and branding</li>
          <li>✅ Use gold (#d4af37) for secondary highlights and badges</li>
          <li>✅ Use forest green (#2d9d78) for success states and positive actions</li>
          <li>✅ Maintain consistent spacing using Tailwind scale (2px, 4px, 8px, 16px...)</li>
          <li>✅ Use Poppins for headlines, DM Sans for body text</li>
          <li>✅ Ensure sufficient contrast for accessibility</li>
        </ul>
      </section>
    </div>
  )
}
