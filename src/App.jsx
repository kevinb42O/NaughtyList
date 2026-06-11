import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import Layout from './components/Layout.jsx'
import Seo from './components/Seo.jsx'
import IntelProvider from './context/IntelProvider.jsx'
import Admin from './views/Admin.jsx'
import Auth from './views/Auth.jsx'
import Chat from './views/Chat.jsx'
import Clans from './views/Clans.jsx'
import Help from './views/Help.jsx'
import Home from './views/Home.jsx'
import Leaderboard from './views/Leaderboard.jsx'
import Messages from './views/Messages.jsx'
import Moderator from './views/Moderator.jsx'
import Profile from './views/Profile.jsx'
import PublicProfile from './views/PublicProfile.jsx'
import Profiles from './views/Profiles.jsx'
import Shadowlist from './views/Shadowlist.jsx'
import Support from './views/Support.jsx'
import Updates from './views/Updates.jsx'

function App() {
  return (
    <IntelProvider>
      <BrowserRouter>
        <Seo />
        <Toaster theme="dark" position="top-center" toastOptions={{ className: 'font-mono text-xs uppercase font-bold tracking-wider' }} />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/add" element={<Navigate to="/?add=1" replace />} />
            <Route path="/clans" element={<Clans />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profiles" element={<Profiles />} />
            <Route path="/profiles/:profileId" element={<PublicProfile />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/support" element={<Support />} />
            <Route path="/help" element={<Help />} />
            <Route path="/updates" element={<Updates />} />
            <Route path="/shadowlist" element={<Shadowlist />} />
            <Route path="/faq" element={<Navigate to="/help" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/moderator" element={<Moderator />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </IntelProvider>
  )
}

export default App
