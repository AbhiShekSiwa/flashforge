import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import NavBar from './components/NavBar.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import Home from './pages/Home.jsx'
import Import from './pages/Import.jsx'
import SetDetail from './pages/SetDetail.jsx'
import Flashcards from './modes/Flashcards.jsx'
import Learn from './modes/Learn.jsx'
import Test from './modes/Test.jsx'
import Match from './modes/Match.jsx'
import Blast from './modes/Blast.jsx'
import Review from './modes/Review.jsx'

// Wrapper reads :id from params so ErrorBoundary has the right backHref
function ModeErrorBoundary({ children }) {
  const { id } = useParams()
  return (
    <ErrorBoundary backHref={id ? `/sets/${id}` : '/'}>
      {children}
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-zinc-900 text-zinc-100">
        <NavBar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/import" element={<Import />} />
          <Route path="/sets/:id" element={<SetDetail />} />
          <Route path="/sets/:id/flashcards" element={<ModeErrorBoundary><Flashcards /></ModeErrorBoundary>} />
          <Route path="/sets/:id/learn" element={<ModeErrorBoundary><Learn /></ModeErrorBoundary>} />
          <Route path="/sets/:id/test" element={<ModeErrorBoundary><Test /></ModeErrorBoundary>} />
          <Route path="/sets/:id/match" element={<ModeErrorBoundary><Match /></ModeErrorBoundary>} />
          <Route path="/sets/:id/blast" element={<ModeErrorBoundary><Blast /></ModeErrorBoundary>} />
          <Route path="/sets/:id/review" element={<ModeErrorBoundary><Review /></ModeErrorBoundary>} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
