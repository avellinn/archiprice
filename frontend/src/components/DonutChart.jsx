import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import './DonutChart.css';

function CustomDonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  const { name, value, percent, color, isPlaceholder, unit = 'projet' } = payload[0].payload;

  if (isPlaceholder) return null;

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__label">{name}</div>
      <div className="chart-tooltip__value" style={{ color }}>
        {value} {unit}{value > 1 ? 's' : ''}
      </div>
      <div className="chart-tooltip__meta">{percent}% du total</div>
    </div>
  );
}

export default function DonutChartCard({ title, data }) {
  const hasData = data.some((item) => item.value > 0);
  const chartData = hasData
    ? data
    : [{
      name: 'Aucun projet',
      value: 0,
      chartValue: 1,
      percent: 0,
      color: '#e2e8f0',
      isPlaceholder: true,
    }];

  return (
    <div className="chart chart--donut">
      <div className="chart-card">
        <div className="chart-card__header">
          <h3 className="chart-card__title">{title}</h3>
        </div>

        <div className="chart-card__content chart-card__content--donut">
          <div className="chart-card__figure">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="chartValue"
                  innerRadius={62}
                  outerRadius={88}
                  paddingAngle={4}
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomDonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-legend">
            {data.map((item, index) => (
              <div key={`${item.name}-${index}`} className="chart-legend__item">
                <span
                  className="chart-legend__dot"
                  style={{ backgroundColor: item.color }}
                />
                <span className="chart-legend__label">{item.name}</span>
                <span className="chart-legend__value">
                  {item.value} · {item.percent}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
