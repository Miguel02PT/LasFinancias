import { motion } from 'framer-motion';
import './Skeleton.css';

export const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton-line skeleton-title"></div>
    <div className="skeleton-line skeleton-text"></div>
    <div className="skeleton-line skeleton-text-short"></div>
  </div>
);

export const SkeletonStats = () => (
  <div className="skeleton-stats-grid">
    <div className="skeleton-stat"></div>
    <div className="skeleton-stat"></div>
    <div className="skeleton-stat"></div>
  </div>
);

export const SkeletonList = ({ count = 3 }) => (
  <div className="skeleton-list">
    {[...Array(count)].map((_, i) => (
      <div key={i} className="skeleton-item"></div>
    ))}
  </div>
);