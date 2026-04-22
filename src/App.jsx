import { BrowserRouter, Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar.jsx'
import Home from './pages/Home.jsx'
import Import from './pages/Import.jsx'
import SetDetail from './pages/SetDetail.jsx'
import Flashcards from './modes/Flashcards.jsx'
import Learn from './modes/Learn.jsx'
import Test from './modes/Test.jsx'
import Match from './modes/Match.jsx'
import Blast from './modes/Blast.jsx'
import Review from './modes/Review.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-zinc-900 text-zinc-100">
        <NavBar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/import" element={<Import />} />
          <Route path="/sets/:id" element={<SetDetail />} />
          <Route path="/sets/:id/flashcards" element={<Flashcards />} />
          <Route path="/sets/:id/learn" element={<Learn />} />
          <Route path="/sets/:id/test" element={<Test />} />
          <Route path="/sets/:id/match" element={<Match />} />
          <Route path="/sets/:id/blast" element={<Blast />} />
          <Route path="/sets/:id/review" element={<Review />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
