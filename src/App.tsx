import { useEffect, useState } from 'react'
import { algorithms } from './algorithms/registry'
import { HomePage } from './components/HomePage'
import { AlgorithmPage } from './components/AlgorithmPage'

function routeFromHash(): string {
  const m = window.location.hash.match(/^#\/algo\/([\w-]+)/)
  return m ? m[1] : ''
}

export default function App() {
  const [algoId, setAlgoId] = useState(routeFromHash)

  useEffect(() => {
    const onHash = () => {
      setAlgoId(routeFromHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const algo = algorithms.find(a => a.id === algoId)

  return (
    <div className="shell">
      <nav className="topbar">
        <div className="brand" onClick={() => (window.location.hash = '#/')}>
          <span className="lens" /> AlgoLens
        </div>
        <span className="crumb">{algo ? `patterns / ${algo.id}` : 'patterns'}</span>
      </nav>
      {algo ? (
        <AlgorithmPage key={algo.id} algo={algo} onBack={() => (window.location.hash = '#/')} />
      ) : (
        <HomePage algos={algorithms} onOpen={id => (window.location.hash = `#/algo/${id}`)} />
      )}
    </div>
  )
}
