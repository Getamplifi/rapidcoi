import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import Login from './screens/Login'
import ContractorDashboard from './screens/ContractorDashboard'
import ContractorOnboarding from './screens/ContractorOnboarding'
import CoiRequestWizard from './screens/CoiRequestWizard'
import AgentDashboard from './screens/AgentDashboard'
import AdminDashboard from './screens/AdminDashboard'

function roleHome(role) {
  if (role === 'contractor') return '/contractor'
  if (role === 'agent') return '/agent'
  if (role === 'admin') return '/admin'
  return '/'
}

function LoadingScreen() {
  return (
    <div className="screen">
      <p className="muted">Loading...</p>
    </div>
  )
}

function NoProfileScreen() {
  return (
    <div className="screen">
      <h1>No account found</h1>
      <p className="muted">
        Your login worked, but there's no RapidCOI profile attached to it yet. Contact your agent to get set up.
      </p>
    </div>
  )
}

function RootRedirect() {
  const { session, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!session) return <Login />
  if (!profile) return <NoProfileScreen />
  return <Navigate to={roleHome(profile.role)} replace />
}

function ProtectedRoute({ role, children }) {
  const { session, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/" replace />
  if (!profile) return <NoProfileScreen />
  if (profile.role !== role) return <Navigate to={roleHome(profile.role)} replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route
          path="/contractor"
          element={
            <ProtectedRoute role="contractor">
              <ContractorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contractor/onboarding"
          element={
            <ProtectedRoute role="contractor">
              <ContractorOnboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contractor/request"
          element={
            <ProtectedRoute role="contractor">
              <CoiRequestWizard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/agent"
          element={
            <ProtectedRoute role="agent">
              <AgentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  )
}
