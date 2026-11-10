import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LeaveGuard, ModuleNav } from './components/ModuleNav.tsx'
import { ComparePage } from './pages/ComparePage.tsx'
import { FaceMapResultsPage } from './pages/FaceMapResultsPage.tsx'
import { FaceMapPage } from './pages/FaceMapPage.tsx'
import { ProductsPage } from './pages/ProductsPage.tsx'
import { ProductPage } from './pages/ProductPage.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { MembershipPage } from './pages/MembershipPage.tsx'
import { QuizPage } from './pages/QuizPage.tsx'
import { SavedPage } from './pages/SavedPage.tsx'
import { QuizProvider } from './qa/session.tsx'

export default function App() {
  return (
    <BrowserRouter>
      <QuizProvider>
        <LeaveGuard>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/qa/:intent" element={<QuizPage />} />
            <Route path="/face-map/results" element={<FaceMapResultsPage />} />
            <Route path="/face-map" element={<FaceMapPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductPage />} />
            <Route path="/saved" element={<SavedPage />} />
            <Route path="/membership" element={<MembershipPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ModuleNav placement="bottom" />
        </LeaveGuard>
      </QuizProvider>
    </BrowserRouter>
  )
}
