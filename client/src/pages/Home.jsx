import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, Sparkles, MessagesSquare } from 'lucide-react';
import { ROUTES } from '../utils/constants';

export default function Home() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="page-container"
    >
      {/* Hero */}
      <section className="mb-16 text-center">
        <span className="badge-primary mb-4">AI-powered matching</span>
        <h1 className="mx-auto max-w-3xl text-balance">
          Find your perfect room — and the right people to share it with.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-700">
          Owners post listings. Tenants create profiles. Our AI ranks matches by budget, location,
          and lifestyle fit.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to={ROUTES.REGISTER} className="btn-primary">
            Get started
          </Link>
          <Link to={ROUTES.LOGIN} className="btn-ghost">
            I already have an account
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="grid gap-6 md:grid-cols-3">
        <Feature
          icon={<Search size={22} />}
          title="Smart search"
          desc="Filter by location, budget, and room type — see the best matches first."
        />
        <Feature
          icon={<Sparkles size={22} />}
          title="AI compatibility"
          desc="Every listing shows a personalised score explaining why it fits you."
        />
        <Feature
          icon={<MessagesSquare size={22} />}
          title="Real-time chat"
          desc="Instant messaging with owners once your interest is accepted."
        />
      </section>
    </motion.div>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }} className="card">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mb-1 text-lg">{title}</h3>
      <p className="text-sm text-neutral-700">{desc}</p>
    </motion.div>
  );
}
