import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import IntelProvider from './context/IntelProvider.jsx'
import AddPlayer from './views/AddPlayer.jsx'
import Admin from './views/Admin.jsx'
import Auth from './views/Auth.jsx'
import Chat from './views/Chat.jsx'
import Clans from './views/Clans.jsx'
import Home from './views/Home.jsx'
import Leaderboard from './views/Leaderboard.jsx'
import Messages from './views/Messages.jsx'
import Moderator from './views/Moderator.jsx'
import Profile from './views/Profile.jsx'
import Profiles from './views/Profiles.jsx'

function App() {
  return (
    <IntelProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/add" element={<AddPlayer />} />
            <Route path="/clans" element={<Clans />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profiles" element={<Profiles />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/messages" element={<Messages />} />
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
