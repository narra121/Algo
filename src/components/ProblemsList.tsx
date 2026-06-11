import type { Problem } from '../core/types'

export function ProblemsList({ problems }: { problems: Problem[] }) {
  return (
    <div className="panel problems">
      <h2>Famous problems solved with this pattern · {problems.length}</h2>
      <table>
        <thead>
          <tr>
            <th>Problem</th>
            <th>Difficulty</th>
            <th>How the pattern applies</th>
          </tr>
        </thead>
        <tbody>
          {problems.map(p => (
            <tr key={p.title}>
              <td>
                <div className="pname">{p.title}</div>
                {p.leetcodeId != null && <div className="pid">LeetCode #{p.leetcodeId}</div>}
              </td>
              <td>
                <span className={`diff ${p.difficulty}`}>{p.difficulty}</span>
              </td>
              <td className="phint">{p.hint}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
