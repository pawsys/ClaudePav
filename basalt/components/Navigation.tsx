"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export default function Navigation() {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold text-blue-600">Basalt</span>
            </Link>
          </div>

          <div className="flex items-center space-x-8">
            <Link
              href="/"
              className={`${
                isActive("/")
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              } px-3 py-2 text-sm font-medium transition-colors`}
            >
              Home
            </Link>
            <Link
              href="/feed"
              className={`${
                isActive("/feed")
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              } px-3 py-2 text-sm font-medium transition-colors`}
            >
              Feed
            </Link>
            <Link
              href="/problems"
              className={`${
                isActive("/problems")
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              } px-3 py-2 text-sm font-medium transition-colors`}
            >
              Problems
            </Link>
            <Link
              href="/solutions"
              className={`${
                isActive("/solutions")
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              } px-3 py-2 text-sm font-medium transition-colors`}
            >
              Solutions
            </Link>
            <Link
              href="/rankings"
              className={`${
                isActive("/rankings")
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              } px-3 py-2 text-sm font-medium transition-colors`}
            >
              Rankings
            </Link>
            <Link
              href="/settings"
              className={`${
                isActive("/settings")
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              } px-3 py-2 text-sm font-medium transition-colors`}
            >
              Settings
            </Link>
          </div>

          <div className="flex items-center">
            <Link
              href="/profile"
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-medium">Profile</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
