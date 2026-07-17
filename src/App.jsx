import { Routes, Route } from 'react-router-dom'
import Login from './screens/Login'
import ContractorDashboard from './screens/ContractorDashboard'
import AgentDashboard from './screens/AgentDashboard'
import AdminDashboard from './screens/AdminDashboard'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/contractor" element={<ContractorDashboard />} />
      <Route path="/agent" element={<AgentDashboard />} />
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  )
}
