import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import AuthGuard from '../auth/AuthGuard'
import RoleGuard from '../auth/RoleGuard'
import LoginPage from '../auth/LoginPage'

// ---------------------------------------------------------------------------
// Lazy-loaded page components — each gets its own chunk for faster initial load
// ---------------------------------------------------------------------------

const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage'))
const TerritoriesPage = lazy(() => import('../features/territories/TerritoriesPage'))
const TerritoryDetail = lazy(() => import('../features/territories/TerritoryDetail'))
const TerritoryCardsPage = lazy(() => import('../features/territory-cards/TerritoryCardsPage'))
const AnnouncePage = lazy(() => import('../features/territories/AnnouncePage'))
const MonthlyReportPage = lazy(() => import('../features/territories/MonthlyReportPage'))
const UsersPage = lazy(() => import('../features/users/UsersPage'))

// ---------------------------------------------------------------------------
// Route-level loading fallback — shown while lazy chunks download
// ---------------------------------------------------------------------------

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <p className="mt-4 text-sm text-slate-500">Loading...</p>
      </div>
    </div>
  )
}

function withSuspense(Component: React.LazyExoticComponent<React.ComponentType>) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  )
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const router = createBrowserRouter([
  // --- Public routes ---
  {
    path: '/login',
    element: <LoginPage />,
  },

  // --- Protected routes (requires authentication) ---
  {
    element: <AuthGuard />,
    children: [
      {
        path: '/',
        element: withSuspense(DashboardPage),
      },
      {
        path: '/territories',
        element: withSuspense(TerritoriesPage),
      },
      {
        path: '/territories/:id',
        element: withSuspense(TerritoryDetail),
      },

      // --- Servant + Admin routes ---
      {
        element: <RoleGuard allowedRoles={['admin', 'servant']} />,
        children: [
          {
            path: '/territory-cards',
            element: withSuspense(TerritoryCardsPage),
          },
          {
            path: '/announce',
            element: withSuspense(AnnouncePage),
          },
          {
            path: '/reports',
            element: withSuspense(MonthlyReportPage),
          },
        ],
      },

      // --- Admin-only routes ---
      {
        element: <RoleGuard allowedRoles={['admin']} />,
        children: [
          {
            path: '/users',
            element: withSuspense(UsersPage),
          },
        ],
      },
    ],
  },

  // --- Catch-all: redirect unknown paths to dashboard ---
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
