import type { AlgorithmModule } from '../core/types'

export function HomePage({
  algos,
  onOpen,
}: {
  algos: AlgorithmModule[]
  onOpen: (id: string) => void
}) {
  const totalProblems = algos.reduce((n, a) => n + a.problems.length, 0)
  return (
    <div>
      <section className="hero">
        <div className="kicker">algolens · {algos.length} patterns · {totalProblems} famous problems</div>
        <h1>
          See algorithms <em>think</em>.
        </h1>
        <p>
          The essential DSA patterns behind the most famous interview problems — animated
          step by step, with the intuition and complexity that make them stick.
        </p>
      </section>
      <div className="algo-grid">
        {algos.map((a, i) => (
          <article
            key={a.id}
            className="algo-card"
            style={{ animationDelay: `${i * 60}ms` }}
            onClick={() => onOpen(a.id)}
          >
            <div className="icon">{a.icon}</div>
            <h3>{a.name}</h3>
            <p className="tagline">{a.tagline}</p>
            <div className="meta">
              <span className="chip time">{a.complexity.time}</span>
              <span className="cat">{a.category}</span>
            </div>
          </article>
        ))}
      </div>
      <footer className="foot">
        <span>built to build intuition</span>
        <span>{totalProblems} problems mapped to {algos.length} patterns</span>
      </footer>
    </div>
  )
}
