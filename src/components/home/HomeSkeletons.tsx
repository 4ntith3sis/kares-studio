/**
 * Skeleton placeholders with IDENTICAL dimensions to the real sections,
 * so Suspense fallbacks cause no layout shift and no design change.
 * Plain var(--card) blocks — no new visual language introduced.
 */

export function CategoriesSkeleton() {
  return (
    <section id="categories" aria-label="Loading categories">
      <div className="container-main">
        <div className="grid-12" style={{ alignItems: 'center' }}>
          <div className="cat-list-col">
            <div className="section-tag" style={{ marginBottom: '1.5rem' }}>
              <span className="star">✹</span>
              <span className="label">[CATEGORIES]</span>
            </div>
            <div id="cat-list">
              {[0, 1, 2, 3].map((i) => (
                <div className="cat-item" key={i} aria-hidden="true">
                  <div className="cat-item-row">
                    <div className="cat-name-group">
                      <span className="cat-num">[0{i + 1}]</span>
                      <span
                        className="cat-name"
                        style={{
                          display: 'inline-block',
                          width: '12rem',
                          height: '2.2rem',
                          background: 'var(--card)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="cat-img-col">
            <div
              className="cat-img-wrap"
              aria-hidden="true"
              style={{ background: 'var(--card)' }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export function FeaturedSkeleton() {
  return (
    <section id="featured" aria-label="Loading featured products">
      <div className="container-main">
        <div className="feat-header">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '3rem', flexWrap: 'wrap', minWidth: 0 }}>
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '.5rem',
                  marginBottom: '.5rem',
                }}
              >
                <span style={{ color: 'var(--accent)' }}>✹</span>
                <span
                  style={{
                    fontFamily: "'DM Mono',monospace",
                    fontSize: 11,
                    letterSpacing: '.2em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                  }}
                >
                  [NEW DROP]
                </span>
              </div>
              <h2>New Arrivals</h2>
            </div>
          </div>
        </div>
      </div>
      <div className="feat-scroll-track">
        <div className="feat-scroll" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div className="prod-card" key={i}>
              <div className="prod-img" style={{ background: 'var(--card)' }} />
              <div className="prod-info">
                <p
                  className="prod-name"
                  style={{
                    width: '8rem',
                    height: '1rem',
                    background: 'var(--card)',
                  }}
                />
                <p
                  className="prod-price"
                  style={{
                    width: '5rem',
                    height: '0.9rem',
                    background: 'var(--card)',
                    marginTop: '.5rem',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
