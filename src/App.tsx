import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Services from './pages/ServicesPage'
import Solutions from './pages/SolutionsPage'
import Consultation from './pages/ConsultationEnLignePage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ProtectedRoute from './components/auth/ProtectedRoute'
import ClientLayout from './pages/client/ClientLayout'
import ClientDashboard from './pages/client/ClientDashboard'
import ClientConsultations from './pages/client/ClientConsultations'
import ClientMeetings from './pages/client/ClientMeetings'
import ClientDemandes from './pages/client/ClientDemandes'
import ClientDocuments from './pages/client/ClientDocuments'
import ClientFactures from './pages/client/ClientFactures'
import ClientProfile from './pages/client/ClientProfile'
import ClientAdminPublications from './pages/client/ClientAdminPublications'
import FournisseurLayout from './pages/fournisseur/FournisseurLayout'
import FournisseurDashboard from './pages/fournisseur/FournisseurDashboard'
import FournisseurDemandes from './pages/fournisseur/FournisseurDemandes'
import FournisseurClients from './pages/fournisseur/FournisseurClients'
import FournisseurCalendar from './pages/fournisseur/FournisseurCalendar'
import FournisseurDocuments from './pages/fournisseur/FournisseurDocuments'
import FournisseurFacturation from './pages/fournisseur/FournisseurFacturation'
import FournisseurEquipe from './pages/fournisseur/FournisseurEquipe'
import FournisseurReports from './pages/fournisseur/FournisseurReports'
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminManageExperts from './pages/admin/AdminManageExperts'
import AdminClients from './pages/admin/AdminClients'
import AdminReports from './pages/admin/AdminReports'
import AdminSettings from './pages/admin/AdminSettings'
import PublicationsPage from './pages/publications/PublicationsPage'
import PublicationDetail from './pages/publications/PublicationDetail'
import AdminDemandes from './pages/admin/AdminDemandes'
function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/solutions" element={<Solutions />} />
          <Route path="/consultation" element={<Consultation />} />
          <Route path="/publications" element={<PublicationsPage />} />
          <Route path="/publications/:slug" element={<PublicationDetail />} />
          <Route path="/client-space/login" element={<LoginPage />} />
          <Route path="/client-space/register" element={<RegisterPage />} />
          <Route path="/client-space/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ForgotPasswordPage />} />
          
          {/* Legacy redirect: any authenticated user; role check happens on /espace-client/* */}
          <Route element={<ProtectedRoute />}>
            <Route path="/client-space/dashboard" element={<Navigate to="/espace-client/dashboard" replace />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['client', 'admin']} />}>
            <Route path="/espace-client" element={<ClientLayout />}>
              <Route index element={<Navigate to="/espace-client/dashboard" replace />} />
              <Route path="dashboard" element={<ClientDashboard />} />
              <Route path="demandes" element={<ClientDemandes />} />
              <Route path="consultations" element={<ClientConsultations />} />
              <Route path="meetings" element={<ClientMeetings />} />
              <Route path="documents" element={<ClientDocuments />} />
              <Route path="factures" element={<ClientFactures />} />
              <Route path="profil" element={<ClientProfile />} />
              <Route path="publications" element={<ClientAdminPublications />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['provider', 'admin']} />}>
            <Route path="/fournisseur" element={<FournisseurLayout />}>
              <Route index element={<Navigate to="/fournisseur/dashboard" replace />} />
              <Route path="dashboard" element={<FournisseurDashboard />} />
              <Route path="demandes" element={<FournisseurDemandes />} />
              <Route path="clients" element={<FournisseurClients />} />
              <Route path="clients/:id" element={<FournisseurClients />} />
              <Route path="calendar" element={<FournisseurCalendar />} />
              <Route path="documents" element={<FournisseurDocuments />} />
              <Route path="facturation" element={<FournisseurFacturation />} />
              <Route path="equipe" element={<FournisseurEquipe />} />
              <Route path="reports" element={<FournisseurReports />} />
            </Route>
          </Route>

          {/* Admin Space */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="experts" element={<AdminManageExperts />} />
              <Route path="clients" element={<AdminClients />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="demandes" element={<AdminDemandes />} />  {/* ✅ */}
            </Route>
          </Route>
        </Routes>
      </div>
    </Router>
  )
}

export default App
