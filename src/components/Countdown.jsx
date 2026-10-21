import { useEffect, useState } from 'react';

/**
 * Live countdown to a deadline, red when overdue. Used for grievance / rights request
 * SLAs (Rule 14(3)) and the 72-hour breach report (Rule 7(2)(b)).
 */
const format = (ms) => {
  const abs = Math.abs(ms);
  const days = Math.floor(abs / 86400000);
  const hours = Math.floor((abs % 86400000) / 3600000);
  const minutes = Math.floor((abs % 3600000) / 60000);
  return days ? `${days}d ${hours}h` : `${hours}h ${minutes}m`;
};

const Countdown = ({ due, done = false, warnHours = 72 }) => {
  const [now, setNow] = useState(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  if (done) return <span className="badge bg-success">Done</span>;
  if (now === null) return <span className="badge bg-secondary">…</span>;
  const left = new Date(due).getTime() - now;
  if (left < 0) return <span className="badge bg-danger">Overdue by {format(left)}</span>;
  return <span className={`badge ${left < warnHours * 3600000 ? 'bg-warning text-dark' : 'bg-secondary'}`}>{format(left)} left</span>;
};

export default Countdown;
