import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { CLINIC } from 'config/compliance';
import PageHeader from 'components/PageHeader';
import { gallery } from '../src/data';

/**
 * Photo gallery. Stock photos served from /public/img/gallery (no request to any other
 * site); credits in public/img/gallery/CREDITS.md and under each photo. Clicking a photo
 * opens it full size: Esc closes, arrow keys move between photos.
 */
const Gallery = () => {
  const [open, setOpen] = useState(null); // index of the photo shown full size
  const closeRef = useRef(null);
  const openerRef = useRef(null);

  const close = useCallback(() => {
    setOpen(null);
    openerRef.current?.focus();
  }, []);
  const step = useCallback((delta) => setOpen((i) => (i === null ? i : (i + delta + gallery.length) % gallery.length)), []);

  useEffect(() => {
    if (open === null) return undefined;
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close, step]);

  const current = open === null ? null : gallery[open];

  return (
    <Fragment>
      <Head>
        <title>{`Gallery | ${CLINIC.tradeName}`}</title>
      </Head>
      <PageHeader title="Gallery" subtitle="A look inside a modern dental clinic." />
      <section className="wrapper">
        <div className="container py-10 py-md-12 lato">
          <div className="row g-4">
            {gallery.map((photo, index) => (
              <div className="col-sm-6 col-lg-4" key={photo.id}>
                <figure className="mb-0">
                  <button
                    type="button"
                    className="border-0 p-0 bg-transparent w-100 d-block rounded overflow-hidden"
                    aria-label={`Open photo: ${photo.title}`}
                    onClick={(e) => {
                      openerRef.current = e.currentTarget;
                      setOpen(index);
                    }}
                  >
                    <Image src={photo.src} alt={photo.alt} width={1200} height={800} style={{ width: '100%', height: 'auto' }} />
                  </button>
                  <figcaption className="mt-2">
                    <span className="merriweather text-title fs-18">{photo.title}</span>
                    <br />
                    <span className="fs-13 text-muted">
                      Photo:{' '}
                      <a href={photo.source} target="_blank" rel="noopener noreferrer">
                        {photo.photographer}
                      </a>{' '}
                      / Unsplash
                    </span>
                  </figcaption>
                </figure>
              </div>
            ))}
          </div>
          <p className="fs-14 text-muted mt-8 mb-0">
            Stock photos used under the Unsplash License to illustrate this sample clinic; they are not photos of a real
            clinic. Want to visit? <Link href="/book-appointment">Request an appointment</Link>.
          </p>
        </div>
      </section>

      {current && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{ background: 'rgba(0, 20, 40, 0.92)', zIndex: 2000 }}
          role="dialog"
          aria-modal="true"
          aria-label={current.title}
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div className="text-center" style={{ maxWidth: 1100, width: '100%' }}>
            <Image src={current.src} alt={current.alt} width={1200} height={800} style={{ width: '100%', height: 'auto', maxHeight: '80vh', objectFit: 'contain' }} />
            <p className="text-white lato mt-3 mb-3">
              {current.title} ({open + 1} of {gallery.length}) · Photo: {current.photographer} / Unsplash
            </p>
            <div className="d-flex justify-content-center gap-2">
              <button type="button" className="btn btn-sm btn-white rounded" onClick={() => step(-1)} aria-label="Previous photo">
                ‹ Previous
              </button>
              <button type="button" className="btn btn-sm btn-white rounded" onClick={close} ref={closeRef}>
                Close
              </button>
              <button type="button" className="btn btn-sm btn-white rounded" onClick={() => step(1)} aria-label="Next photo">
                Next ›
              </button>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
};

export default Gallery;
