import Image from 'next/image';

/**
 * Image tiles beside the "Best Dental Hospital" text.
 *
 * The template's /img/best-dental-hospital*.webp files are size placeholders
 * ("844x1045", "1500x1500", "1325x1500"), so each tile shows a branded panel until a
 * real photo is set. To use a photo, put it in /public/img (self-hosted, no third-party
 * request) and set `src`, `width` and `height` on the tile.
 */
const tiles = [
  {
    src: null, // e.g. '/img/clinic-reception.webp'
    width: 844,
    height: 1046,
    alt: 'Dental Clinic team',
    icon: 'uil-user-md',
    label: 'Experienced dentists',
    tone: 'light',
    // Captions sit in the corner away from the "Patients Treated" circle in Services.jsx.
    placement: 'top-start',
    className: 'col-md-10 offset-md-2'
  },
  {
    src: null,
    width: 1500,
    height: 1500,
    alt: 'Dental Clinic treatment room',
    icon: 'uil-clinic-medical',
    label: 'Modern equipment',
    tone: 'dark',
    placement: 'bottom-start',
    className: 'col-md-12'
  },
  {
    src: null,
    width: 1325,
    height: 1500,
    alt: 'Smiling patient at Dental Clinic',
    icon: 'uil-smile',
    label: 'Gentle, painless care',
    tone: 'light',
    placement: 'bottom-end',
    single: true
  }
];

const TONES = {
  light: { background: 'linear-gradient(135deg, #e0e7ef 0%, #b3e5fc 100%)', color: '#003366' },
  dark: { background: 'linear-gradient(135deg, #003366 0%, #5b8fbf 100%)', color: '#ffffff' }
};

// placement "<vertical>-<horizontal>" → flex classes for the caption corner.
const placementClasses = (placement) => {
  const [vertical, horizontal] = placement.split('-');
  return `justify-content-${vertical === 'top' ? 'start' : 'end'} align-items-${horizontal} text-${horizontal}`;
};

const Tile = ({ src, width, height, alt, icon, label, tone, placement }) => (
  <figure className="rounded overflow-hidden mb-0">
    {src ? (
      <Image src={src} alt={alt} width={width} height={height} style={{ width: '100%', height: 'auto' }} />
    ) : (
      <div
        className={`d-flex flex-column p-4 p-xl-5 ${placementClasses(placement)}`}
        style={{ aspectRatio: `${width} / ${height}`, ...TONES[tone] }}
      >
        <i className={`uil ${icon} fs-60 mb-2`} aria-hidden="true" style={{ color: TONES[tone].color }} />
        <figcaption className="merriweather fs-20" style={{ color: TONES[tone].color }}>
          {label}
        </figcaption>
      </div>
    )}
  </figure>
);

const Tiles = () => (
  <div className="row gx-md-5 gy-5 align-items-center">
    <div className="col-md-6">
      <div className="row gx-md-5 gy-5">
        {tiles
          .filter((tile) => !tile.single)
          .map((tile) => (
            <div className={tile.className} key={tile.label}>
              <Tile {...tile} />
            </div>
          ))}
      </div>
    </div>

    <div className="col-md-6">
      <Tile {...tiles.find((tile) => tile.single)} />
    </div>
  </div>
);

export default Tiles;
