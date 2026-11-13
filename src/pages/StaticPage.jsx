import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import { FiChevronDown } from 'react-icons/fi';
import { staticPages, faqs } from '../data/content';

export default function StaticPage() {
  const { slug } = useParams();
  const page = staticPages[slug];
  const [openFaq, setOpenFaq] = useState(0);

  if (!page) {
    return (
      <main className="container section-padding">
        <div className="empty-state">
          <h2>Page not found</h2>
          <p>The page you’re looking for doesn’t exist.</p>
          <Link className="btn-primary" to="/">Back to home</Link>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="page-head">
        <div className="container">
          <h1 className="page-title">{page.title}</h1>
          <ul className="breadcrumb">
            <li><Link to="/">Home</Link></li>
            <li>/</li>
            <li>{page.title}</li>
          </ul>
        </div>
      </div>

      <div className="container section-padding static-content">
        {page.faq
          ? faqs.map((item, i) => (
              <div className={`faq-item ${openFaq === i ? 'open' : ''}`} key={i}>
                <button className="faq-q" onClick={() => setOpenFaq(openFaq === i ? -1 : i)} aria-expanded={openFaq === i}>
                  {item.q}
                  <FiChevronDown style={{ transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform .3s', flexShrink: 0 }} />
                </button>
                <div className="faq-a">{item.a}</div>
              </div>
            ))
          : page.body.map((block, i) => {
              switch (block.type) {
                case 'h2':
                  return <h2 key={i}>{block.text}</h2>;
                case 'ul':
                  return (
                    <ul key={i}>{block.items.map((li) => <li key={li}>{li}</li>)}</ul>
                  );
                default:
                  return <p key={i}>{block.text}</p>;
              }
            })}
      </div>
    </main>
  );
}
