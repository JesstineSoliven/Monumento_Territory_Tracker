import { createBrowserRouter, Navigate } from 'react-router-dom'
import AuthGuard from '../auth/AuthGuard'
import RoleGuard from '../auth/RoleGuard'
import LoginPage from '../auth/LoginPage'
import DashboardPage from '../features/dashboard/DashboardPage'
import TerritoriesPage from '../features/territories/TerritoriesPage'
import UsersPage from '../features/users/UsersPage'
import TerritoryCardsPage from '../features/territory-cards/TerritoryCardsPage'
import AnnouncePage from '../features/territories/AnnouncePage'
import TerritoryDetail from '../features/territories/TerritoryDetail'

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
        element: <DashboardPage />,
      },
      {
        path: '/territories',
        element: <TerritoriesPage />,
      },
      {
        path: '/territories/:id',
        element: <TerritoryDetail />,
      },

      // --- Servant + Admin routes ---
      {
        element: <RoleGuard allowedRoles={['admin', 'servant']} />,
        children: [
          {
            path: '/territory-cards',
            element: <TerritoryCardsPage />,
          },
          {
            path: '/announce',
            element: <AnnouncePage />,
          },
        ],
      },

      // --- Admin-only routes ---
      {
        element: <RoleGuard allowedRoles={['admin']} />,
        children: [
          {
            path: '/users',
            element: <UsersPage />,
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
