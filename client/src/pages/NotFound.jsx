import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ROUTES } from '../utils/constants';

export default function NotFound() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="page-container text-center"
    >
      <h1 className="mb-2">404</h1>
      <p className="mb-6 text-neutral-700">We couldn't find the page you were looking for.</p>
      <Link to={ROUTES.HOME} className="btn-primary">
        Back to home
      </Link>
    </motion.div>
  );
}
