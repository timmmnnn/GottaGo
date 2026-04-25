import 'leaflet/dist/leaflet.css'
import { AppRail, ControlPanel } from './components/ControlPanel'
import { MapPanel } from './components/MapPanel'
import { useGottaGoController } from './hooks/useGottaGoController'
import './App.css'

function App() {
  const { controlPanelProps, mapPanelProps, panelPage, setPanelPage } = useGottaGoController()

  return (
    <main className="app-shell">
      <AppRail activePage={panelPage} onPageChange={setPanelPage} />
      <ControlPanel {...controlPanelProps} />
      <MapPanel {...mapPanelProps} />
    </main>
  )
}

export default App
